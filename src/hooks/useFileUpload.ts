import { useState } from "react";
import { FileProcessingService } from "@/services/fileProcessing";
import type { DocumentData } from "@/types/document";
import { useToast } from "@/hooks/use-toast";
import { DocumentAnalysisService } from "@/services/documentAnalysis";

export const useFileUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const fileService = FileProcessingService.getInstance();
  const documentAnalysisService = DocumentAnalysisService.getInstance();

  const processFile = async (file: File): Promise<DocumentData | null> => {
    try {
      console.log('Processing file:', { name: file.name, size: file.size, type: file.type });
      setIsProcessing(true);

      // Validate file
      const validation = fileService.validateFile(file);
      if (!validation.isValid) {
        console.log('File validation failed:', validation.error);
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
        });
        return null;
      }

      console.log('File validation passed');
      
      // Warm up connections in the background (non-blocking)
      // This pre-establishes HTTP connections so processing is faster
      documentAnalysisService.warmupConnections().catch(err => {
        console.warn('Connection warm-up failed (non-critical):', err);
      });
      
      // Just process the file without saving to database
      // Database save will happen after extraction in Step 3
      const documentData = await fileService.processFile(file);
      console.log('File processed successfully:', documentData);
      
      toast({
        title: "Document uploaded successfully",
        description: `${file.name} is ready for processing`,
      });

      return documentData;
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent): Promise<DocumentData | null> => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return null;

    return processFile(files[0]);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>): Promise<DocumentData | null> => {
    console.log('handleFileInput called');
    console.log('Event target:', e.target);
    console.log('Files from event:', e.target.files);
    console.log('Number of files:', e.target.files?.length);
    
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      console.log('No files selected');
      return null;
    }

    console.log('Selected files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    // Process the selected file
    const result = await processFile(files[0]);
    
    // Clear the input to ensure fresh selections each time
    e.target.value = '';
    console.log('Input cleared');
    
    return result;
  };

  return {
    isProcessing,
    dragActive,
    processFile,
    handleDrag,
    handleDrop,
    handleFileInput,
    formatFileSize: fileService.formatFileSize.bind(fileService),
    getFileTypeIcon: fileService.getFileTypeIcon.bind(fileService)
  };
};