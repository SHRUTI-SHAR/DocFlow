import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult, AnalysisTask } from "@/types/document";
import { backendConfig } from "./backendConfig";

export class DocumentAnalysisService {
  private static instance: DocumentAnalysisService;

  constructor() {
    // Backend configuration is now handled by backendConfig service
  }

  static getInstance(): DocumentAnalysisService {
    if (!DocumentAnalysisService.instance) {
      DocumentAnalysisService.instance = new DocumentAnalysisService();
    }
    return DocumentAnalysisService.instance;
  }

  /**
   * Warm up HTTP connections by initializing the connection pool
   * This should be called when a user uploads a file to pre-establish connections
   */
  async warmupConnections(): Promise<void> {
    try {
      const config = backendConfig.getConfig();
      console.log('[DocumentAnalysis] Warming up connections...');
      
      const response = await fetch(`${config.fastApiUrl}/api/v1/warmup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('[DocumentAnalysis] Warm-up failed (non-critical):', response.status);
        return; // Non-critical, don't throw
      }

      const result = await response.json();
      console.log('[DocumentAnalysis] Connection warm-up completed:', result.message);
    } catch (error) {
      // Non-critical - connections will be created on first real request
      console.warn('[DocumentAnalysis] Connection warm-up error (non-critical):', error);
    }
  }

  async analyzeDocument(
    documentData: string,
    task: AnalysisTask,
    documentName?: string,
    enhancedTemplates?: any[],
    saveToDatabase: boolean = true,
    maxWorkers?: number,
    maxThreads?: number,
    yoloSignatureEnabled?: boolean,
    yoloFaceEnabled?: boolean,
    abortSignal?: AbortSignal,
    documentType?: string
  ): Promise<AnalysisResult & { requestId?: string }> {
    try {
      const config = backendConfig.getConfig();
      console.log(`[DocumentAnalysis] Using ${config.type} backend for analysis`);
      console.log('[DocumentAnalysis] Task:', task);
      console.log('[DocumentAnalysis] Document name:', documentName);
      console.log('[DocumentAnalysis] Data length:', documentData.length);
      console.log('[DocumentAnalysis] Data type:', documentData.startsWith('data:') ? 'Data URL' : 'Text');

      // Check if documentData is text (extracted from PDF) or image data
      const isTextData = !documentData.startsWith('data:') && !documentData.startsWith('http');
      
      // NO PAYLOAD SIZE LIMIT - Process documents of any size
      console.log('[DocumentAnalysis] Payload info:', {
        isTextData,
        dataLength: documentData.length
      });

      // Get current user for database saving
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[DocumentAnalysis] Current user:', user?.id || 'Not authenticated');

      let response: Response;
      
      console.log('[DocumentAnalysis] Calling FastAPI backend:', config.fastApiUrl);
      console.log('[DocumentAnalysis] Document type:', documentType || 'not specified');
      // Call FastAPI backend only
      response = await fetch(`${config.fastApiUrl}/api/v1/analyze-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortSignal,
        body: JSON.stringify({
          documentData: documentData,
          task,
          documentName,
          userId: user?.id || null,
          saveToDatabase: saveToDatabase,
          enhancedTemplates,
          maxWorkers: maxWorkers || null,
          maxThreads: maxThreads || null,
          yoloSignatureEnabled: yoloSignatureEnabled !== undefined ? yoloSignatureEnabled : null,
          yoloFaceEnabled: yoloFaceEnabled !== undefined ? yoloFaceEnabled : null,
          documentType: documentType || null
        })
      });

      // Handle FastAPI response
      console.log('[DocumentAnalysis] FastAPI response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DocumentAnalysis] HTTP Error Response:', errorData);
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to analyze document for ${task}`);
      }

      const data = await response.json();
      console.log('[DocumentAnalysis] Backend Response:', data);

      if (!data.success) {
        console.error('[DocumentAnalysis] Backend returned success=false:', data);
        throw new Error(data.error || `Analysis failed for ${task}`);
      }

      // Return the full response including success status
      return {
        success: data.success,
        task: data.task,
        result: data.result,
        usage: data.usage,
        savedDocument: data.savedDocument,
        documentId: data.savedDocument?.id || null,
        convertedImages: data.convertedImages,
        warnings: data.warnings || [],
        requestId: data.requestId
      };
    } catch (error) {
      console.error(`[DocumentAnalysis] Error during ${task}:`, error);
      
      // Handle AbortError (cancellation)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled by user');
      }
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`Network error: Unable to connect to analysis service. Please check your internet connection.`);
        } else if (error.message.includes('Unknown file handlers')) {
          throw new Error(`File type not supported. Please upload PDF, JPG, PNG, or WEBP files only.`);
        } else {
          throw error;
        }
      } else {
        throw new Error(`Unknown error during ${task}: ${String(error)}`);
      }
    }
  }

  async cancelRequest(requestId: string): Promise<void> {
    try {
      const config = backendConfig.getConfig();
      const response = await fetch(`${config.fastApiUrl}/api/v1/cancel-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel request');
      }
      
      console.log('[DocumentAnalysis] Cancellation request sent successfully');
    } catch (error) {
      console.error('[DocumentAnalysis] Error cancelling request:', error);
      throw error;
    }
  }

  async extractText(documentData: string, documentName?: string): Promise<AnalysisResult> {
    return this.analyzeDocument(documentData, 'field_detection', documentName);
  }

  async detectFields(documentData: string, documentName?: string): Promise<AnalysisResult> {
    return this.analyzeDocument(documentData, 'field_detection', documentName);
  }

  async matchTemplates(documentData: string, documentName?: string, enhancedTemplates?: any[]): Promise<AnalysisResult> {
    return this.analyzeDocument(documentData, 'template_matching', documentName, enhancedTemplates);
  }

  async directSaveToDatabase(
    result: any,
    task: string,
    userId: string,
    documentName?: string,
    documentId?: string
  ): Promise<{
    success: boolean;
    message: string;
    documentId: string | null;
    savedDocument: { id: string } | null;
    action: string;
    hasEmbedding: boolean;
  }> {
    try {
      const config = backendConfig.getConfig();
      console.log(`[DocumentAnalysis] Using ${config.type} backend for direct save`);
      console.log('[DocumentAnalysis] Task:', task);
      console.log('[DocumentAnalysis] Document name:', documentName);
      console.log('[DocumentAnalysis] Result keys:', Object.keys(result));

      const response = await fetch(`${config.fastApiUrl}/api/v1/direct-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result,
          task,
          userId,
          documentName,
          documentId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct save failed: ${response.status} ${errorText}`);
      }

      const saveResult = await response.json();
      console.log('[DocumentAnalysis] Direct save result:', saveResult);
      return saveResult;

    } catch (error) {
      console.error('[DocumentAnalysis] Direct save error:', error);
      throw error;
    }
  }
}