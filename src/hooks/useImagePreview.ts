import { useState } from 'react';
import { useToast } from './use-toast';

interface ImagePreviewResponse {
  images: string[];
  totalPages: number;
  success: boolean;
  message: string;
}

export const useImagePreview = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const previewImages = async (documentData: string) => {
    if (!documentData) {
      toast({
        title: "Error",
        description: "No document data provided",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fastApiUrl = (import.meta as any).env.VITE_FASTAPI_URL;
      if (!fastApiUrl) throw new Error('VITE_FASTAPI_URL is required');
      const response = await fetch(`${fastApiUrl}/api/v1/preview-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentData: documentData,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      // Parse JSON with error handling
      let result: ImagePreviewResponse;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      if (result.success && result.images.length > 0) {
        setImages(result.images);
        setIsModalOpen(true);
        toast({
          title: "Images Ready",
          description: `Converted ${result.totalPages} pages to images`,
        });
      } else {
        throw new Error(result.message || 'No images generated');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImages([]);
  };

  return {
    previewImages,
    closeModal,
    isLoading,
    images,
    isModalOpen,
    setImages,
    setIsModalOpen,
  };
};
