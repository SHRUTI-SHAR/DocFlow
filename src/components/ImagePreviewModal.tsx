import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  title?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  images,
  title = "Converted PDF Images"
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex];
  const isFirstImage = currentImageIndex === 0;
  const isLastImage = currentImageIndex === images.length - 1;

  const goToPrevious = () => {
    if (!isFirstImage) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const goToNext = () => {
    if (!isLastImage) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handleClose = () => {
    setCurrentImageIndex(0);
    onClose();
  };

  const getImageExtension = (dataUrl: string): string => {
    // Extract format from data URL (e.g., "data:image/jpeg;base64," -> "jpeg")
    const match = dataUrl.match(/^data:image\/([^;]+);/);
    if (match && match[1]) {
      const format = match[1].toLowerCase();
      // Normalize format names
      if (format === 'jpeg' || format === 'jpg') return 'jpg';
      if (format === 'png') return 'png';
      return format;
    }
    // Default to jpg if format cannot be determined (images from backend are JPEG)
    return 'jpg';
  };

  const downloadCurrentPage = () => {
    if (!currentImage) return;
    
    const extension = getImageExtension(currentImage);
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `page-${currentImageIndex + 1}-converted.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllPages = () => {
    images.forEach((image, index) => {
      const extension = getImageExtension(image);
      const link = document.createElement('a');
      link.href = image;
      link.download = `page-${index + 1}-converted.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title} - Page {currentImageIndex + 1} of {images.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadCurrentPage}>
                <Download className="h-4 w-4 mr-1" />
                Download Page
              </Button>
              {images.length > 1 && (
                <Button variant="outline" size="sm" onClick={downloadAllPages}>
                  <Download className="h-4 w-4 mr-1" />
                  Download All
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Image */}
          <div className="flex justify-center items-center bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={currentImage}
              alt={`PDF Page ${currentImageIndex + 1}`}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                onClick={goToPrevious}
                disabled={isFirstImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={goToNext}
                disabled={isLastImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Page Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                className={`flex-shrink-0 border-2 rounded ${
                  index === currentImageIndex
                    ? 'border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <img
                  src={image}
                  alt={`Page ${index + 1} thumbnail`}
                  className="w-16 h-20 object-cover rounded"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewModal;
