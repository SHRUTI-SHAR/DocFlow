import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentClassification {
  category: string;
  categoryName: string;
  categoryDescription: string;
  confidence: number;
  tags: string[];
  summary: string;
  extracted_data?: Record<string, any>;
  suggested_actions?: string[];
  externalSystem?: string;
  extractionSchema?: Record<string, string>;
  language?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  classifiedAt: string;
}

export interface ExternalSystemProcessing {
  system: string;
  systemName: string;
  action: string;
  status: 'pending' | 'queued' | 'sent' | 'webhook_failed' | 'completed';
  availableActions: string[];
  hasWebhook: boolean;
}

export interface ClassificationResult {
  success: boolean;
  documentId: string;
  classification?: DocumentClassification;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  processing?: ExternalSystemProcessing;
  error?: string;
}

export const useDocumentClassification = () => {
  const [isClassifying, setIsClassifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [classification, setClassification] = useState<DocumentClassification | null>(null);
  const [processing, setProcessing] = useState<ExternalSystemProcessing | null>(null);
  const { toast } = useToast();

  const classifyDocument = useCallback(async (
    documentId: string,
    text?: string,
    fileName?: string,
    mimeType?: string,
    imageBase64?: string
  ): Promise<ClassificationResult> => {
    setIsClassifying(true);
    setClassification(null);

    try {
      console.log('Classifying document:', documentId);

      const { data, error } = await supabase.functions.invoke('classify-document', {
        body: {
          documentId,
          text,
          fileName,
          mimeType,
          imageBase64
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Classification failed');
      }

      setClassification(data.classification);

      toast({
        title: 'Document Classified',
        description: `Identified as: ${data.classification.categoryName} (${Math.round(data.classification.confidence * 100)}% confidence)`,
      });

      return {
        success: true,
        documentId,
        classification: data.classification
      };

    } catch (error) {
      console.error('Classification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Classification failed';
      
      toast({
        title: 'Classification Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        documentId,
        error: errorMessage
      };
    } finally {
      setIsClassifying(false);
    }
  }, [toast]);

  const processWithExternalSystem = useCallback(async (
    documentId: string,
    externalSystem: string,
    action?: string,
    extractedData?: Record<string, any>,
    classificationData?: DocumentClassification
  ): Promise<ProcessingResult> => {
    setIsProcessing(true);
    setProcessing(null);

    try {
      console.log('Processing with external system:', externalSystem);

      const { data, error } = await supabase.functions.invoke('process-external-system', {
        body: {
          documentId,
          externalSystem,
          action,
          extractedData,
          classification: classificationData
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      setProcessing(data.processing);

      toast({
        title: 'Document Routed',
        description: `Sent to ${data.processing.systemName} (${data.processing.status})`,
      });

      return {
        success: true,
        documentId,
        processing: data.processing
      };

    } catch (error) {
      console.error('Processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        documentId,
        error: errorMessage
      };
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const classifyAndProcess = useCallback(async (
    documentId: string,
    text?: string,
    fileName?: string,
    mimeType?: string,
    imageBase64?: string
  ): Promise<{ classification: ClassificationResult; processing?: ProcessingResult }> => {
    // First classify
    const classificationResult = await classifyDocument(documentId, text, fileName, mimeType, imageBase64);

    // If classification successful and has an external system, auto-process
    if (classificationResult.success && classificationResult.classification?.externalSystem) {
      const processingResult = await processWithExternalSystem(
        documentId,
        classificationResult.classification.externalSystem,
        undefined,
        classificationResult.classification.extracted_data,
        classificationResult.classification
      );

      return {
        classification: classificationResult,
        processing: processingResult
      };
    }

    return { classification: classificationResult };
  }, [classifyDocument, processWithExternalSystem]);

  const reset = useCallback(() => {
    setClassification(null);
    setProcessing(null);
    setIsClassifying(false);
    setIsProcessing(false);
  }, []);

  return {
    isClassifying,
    isProcessing,
    classification,
    processing,
    classifyDocument,
    processWithExternalSystem,
    classifyAndProcess,
    reset
  };
};
