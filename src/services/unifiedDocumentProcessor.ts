import { supabase } from "@/integrations/supabase/client";

export interface ProcessedDocumentResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export class UnifiedDocumentProcessor {
  private static instance: UnifiedDocumentProcessor;

  static getInstance(): UnifiedDocumentProcessor {
    if (!UnifiedDocumentProcessor.instance) {
      UnifiedDocumentProcessor.instance = new UnifiedDocumentProcessor();
    }
    return UnifiedDocumentProcessor.instance;
  }

  async saveDocumentToDatabase(
    file: File,
    extractedText: string | unknown = '',
    analysisResult?: any
  ): Promise<ProcessedDocumentResult> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return { success: false, error: `File upload failed: ${uploadError.message}` };
      }

      // Normalize extractedText to string
      const normalizedExtractedText = typeof extractedText === 'string'
        ? extractedText
        : Array.isArray(extractedText)
          ? extractedText.join('\n')
          : extractedText && typeof extractedText === 'object' && 'text' in (extractedText as any) && typeof (extractedText as any).text === 'string'
            ? (extractedText as any).text
            : String(extractedText ?? '');

      // Save document to database
      const { data: documentData, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.user.id,
          file_name: file.name,
          storage_path: uploadData.path,
          file_size: file.size,
          file_type: file.type || 'unknown',
          processing_status: 'processing',
          extracted_text: normalizedExtractedText,
          metadata: {
            originalFileName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size,
            mimeType: file.type,
            analysisResult: analysisResult || {}
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Document insert error:', insertError);
        return { success: false, error: `Database save failed: ${insertError.message}` };
      }

      // Generate embeddings for RAG if we have extracted text
      if (normalizedExtractedText && normalizedExtractedText.trim().length > 0) {
        try {
          console.log('Generating embeddings for document:', documentData.id);
          const { data: embeddingResult, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
            body: { 
              text: normalizedExtractedText,
              documentId: documentData.id 
            }
          });
          
          if (embeddingError) {
            console.error('Embedding generation failed:', embeddingError);
          } else {
            console.log('Embeddings generated successfully for document:', documentData.id);
          }
        } catch (embeddingError) {
          console.error('Error generating embeddings:', embeddingError);
        }
      }

      // Update processing status
      const { error: updateError } = await supabase
        .from('documents')
        .update({ processing_status: 'completed' })
        .eq('id', documentData.id);

      if (updateError) {
        console.error('Status update error:', updateError);
      }

      return { 
        success: true, 
        documentId: documentData.id 
      };

    } catch (error) {
      console.error('UnifiedDocumentProcessor error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async processDocumentWithAI(
    file: File,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<ProcessedDocumentResult> {
    try {
      onProgress?.(10, 'Uploading file...');

      // Skip AI analysis in Step 1 to reduce token costs
      // Field detection will be done later when needed (Step 3)
      onProgress?.(50, 'Preparing document...');
      
      const extractedText = '';  // No text extraction in Step 1
      
      onProgress?.(90, 'Saving to database...');

      // Save with extracted text and analysis results
      const saveResult = await this.saveDocumentToDatabase(
        file,
        extractedText,
        null // No analysis result in Step 1
      );

      onProgress?.(100, 'Complete!');

      return saveResult;

    } catch (error) {
      console.error('AI processing error:', error);
      onProgress?.(50, 'Processing failed, saving basic document...');
      
      // Fallback to basic save
      return await this.saveDocumentToDatabase(file, '', null);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}