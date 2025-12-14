import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ImagePreviewProps {
  url: string;
  fileName: string;
  zoom: number;
  rotation: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  url,
  fileName,
  zoom,
  rotation
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Unable to load image</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full overflow-auto p-4">
      {!isLoaded && (
        <Skeleton className="h-64 w-64 rounded-lg" />
      )}
      <img
        src={url}
        alt={fileName}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className="max-w-full max-h-full object-contain transition-transform duration-200"
        style={{
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          display: isLoaded ? 'block' : 'none'
        }}
      />
    </div>
  );
};
