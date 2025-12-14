import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DocumentAnalysisService } from '@/services/documentAnalysis';
import { convertHierarchicalDataToFields } from './formUtils';
import type { TemplateField } from '@/types/template';

interface UseFormFileUploadReturn {
  isUploading: boolean;
  handleFileUpload: (file: File) => Promise<{
    fields: TemplateField[];
    sections: Array<{ id: string; name: string; order: number }>;
    hierarchicalData: any;
    title: string;
    description: string;
  } | null>;
}

export const useFormFileUpload = (): UseFormFileUploadReturn => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File): Promise<{
    fields: TemplateField[];
    sections: Array<{ id: string; name: string; order: number }>;
    hierarchicalData: any;
    title: string;
    description: string;
  } | null> => {
    setIsUploading(true);

    try {
      // Convert file to base64 data URL
      const reader = new FileReader();
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
      });

      // Validate document format
      if (!fileDataUrl.startsWith('data:')) {
        throw new Error('Invalid file format');
      }

      toast({
        title: 'Analyzing Document',
        description: 'Using AI to detect form fields...',
      });

      // Use DocumentAnalysisService to analyze the document with form_creation task
      // This uses the correct form_creation prompt (not field_detection which is for templates)
      const service = DocumentAnalysisService.getInstance();
      const result = await service.analyzeDocument(
        fileDataUrl,
        'form_creation',
        file.name,
        null,
        false // Don't save to database automatically
      );

      console.log('Document analysis result:', result);

      // Extract hierarchical_data from result
      const hierarchicalData = result?.result?.hierarchical_data;

      if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
        // Convert hierarchical_data to fields and sections
        const { fields, sections } = convertHierarchicalDataToFields(hierarchicalData);

        console.log('Converted fields:', fields.length, 'fields in', sections.length, 'sections');

        if (fields.length > 0) {
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          toast({
            title: 'Fields Detected Successfully',
            description: `Found ${fields.length} fields in ${sections.length} sections`,
          });

          return {
            fields,
            sections: sections.length > 0 ? sections : [{ id: 'general', name: 'General', order: 0 }],
            hierarchicalData,
            title: `Form from ${fileName}`,
            description: `Automatically generated form from ${file.name}`,
          };
        } else {
          // Fallback: if no fields detected, create empty form
          const fileName = file.name.replace(/\.[^/.]+$/, '');
          toast({
            title: 'No Fields Detected',
            description: 'You can add fields manually',
            variant: 'default',
          });

          return {
            fields: [],
            sections: [{ id: 'general', name: 'General', order: 0 }],
            hierarchicalData: {},
            title: `Form from ${fileName}`,
            description: `Form created from ${file.name}`,
          };
        }
      } else {
        // Fallback: if no hierarchical_data, create empty form
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        toast({
          title: 'Document Processed',
          description: 'Add fields manually or try uploading again',
          variant: 'default',
        });

        return {
          fields: [],
          sections: [{ id: 'general', name: 'General', order: 0 }],
          hierarchicalData: {},
          title: `Form from ${fileName}`,
          description: `Form created from ${file.name}`,
        };
      }
    } catch (error) {
      console.error('Error processing document:', error);
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Failed to process document. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, handleFileUpload };
};

