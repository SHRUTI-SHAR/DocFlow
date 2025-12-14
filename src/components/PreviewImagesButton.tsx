import React from 'react';
import { Button } from './ui/button';
import { Eye } from 'lucide-react';
import { useImagePreview } from '../hooks/useImagePreview';
import ImagePreviewModal from './ImagePreviewModal';

interface PreviewImagesButtonProps {
  documentData: string;
  convertedImages?: string[]; // Pre-converted images (optional)
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

const PreviewImagesButton: React.FC<PreviewImagesButtonProps> = ({
  documentData,
  convertedImages,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  className = ''
}) => {
  const { closeModal, isLoading, images, isModalOpen, setImages, setIsModalOpen } = useImagePreview();

  const handlePreview = () => {
    // Only show pre-converted images - no fallback conversion
    if (convertedImages && convertedImages.length > 0) {
      setImages(convertedImages);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handlePreview}
        disabled={disabled || isLoading || !documentData || !convertedImages || convertedImages.length === 0}
        size={size}
        variant={variant}
        className={className}
      >
        <>
          <Eye className="h-4 w-4 mr-2" />
          View Images
        </>
      </Button>

      <ImagePreviewModal
        isOpen={isModalOpen}
        onClose={closeModal}
        images={images}
        title="PDF Converted to Images"
      />
    </>
  );
};

export default PreviewImagesButton;
