import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  storage_url?: string;
  storage_path?: string;
}

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose
}) => {
  const [imageObjectUrl, setImageObjectUrl] = React.useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = React.useState(false);
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = React.useState(false);

  // Check file type more accurately - prioritize file extension
  const fileName = (document?.file_name || '').toLowerCase();
  const fileExt = fileName.split('.').pop() || '';
  
  // Image extensions - check extension FIRST, it's more reliable
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
  const isImage = imageExtensions.includes(fileExt);
  
  // PDF check - only if NOT an image
  const isPDF = !isImage && (fileExt === 'pdf' || document?.file_type === 'application/pdf');
  
  // Generate signed URL when document opens
  React.useEffect(() => {
    if (!isOpen || !document?.storage_path) {
      setResolvedUrl(null);
      return;
    }

    setIsLoadingUrl(true);
    const generateSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.storage_path!, 3600); // Valid for 1 hour

        if (error) {
          console.error('Failed to generate signed URL:', error);
          setResolvedUrl(null);
          return;
        }

        if (data?.signedUrl) {
          setResolvedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error generating signed URL:', err);
        setResolvedUrl(null);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    generateSignedUrl();
  }, [isOpen, document?.storage_path]);
  
  // Fetch image as blob to bypass CORS issues
  React.useEffect(() => {
    // Always run cleanup
    if (!isOpen || !document || !isImage || !resolvedUrl) {
      return;
    }

    setIsLoadingImage(true);
    fetch(resolvedUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setImageObjectUrl(url);
        setIsLoadingImage(false);
      })
      .catch(error => {
        console.error('Failed to load image:', error);
        setIsLoadingImage(false);
      });
  }, [document?.id, resolvedUrl, isImage, isOpen]);

  // Cleanup object URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
        setImageObjectUrl(null);
      }
    };
  }, []);
  
  // Debug log
  React.useEffect(() => {
    if (document) {
      console.log('Document viewer:', {
        fileName: document.file_name,
        fileType: document.file_type,
        fileExt,
        isImage,
        isPDF
      });
    }
  }, [document?.id, fileExt, isImage, isPDF]);

  const handleDownload = async () => {
    if (!resolvedUrl) return;
    
    try {
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document?.file_name || 'document';
      globalThis.document.body.appendChild(a);
      a.click();
      globalThis.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleOpenInNewTab = () => {
    if (resolvedUrl) {
      globalThis.open(resolvedUrl, '_blank');
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {document.file_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Tab
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {isLoadingUrl ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          ) : !resolvedUrl ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to load document</p>
            </div>
          ) : isPDF ? (
            <iframe
              src={resolvedUrl}
              className="w-full h-full border-0"
              title={document.file_name}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full p-4">
              {isLoadingImage ? (
                <p className="text-muted-foreground">Loading image...</p>
              ) : imageObjectUrl ? (
                <img
                  src={imageObjectUrl}
                  alt={document.file_name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-muted-foreground">Failed to load image</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-muted-foreground">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
