import React from 'react';

interface VideoPreviewProps {
  url: string;
  fileName: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ url, fileName }) => {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <video
        controls
        className="max-w-full max-h-full rounded-lg shadow-lg"
        preload="metadata"
      >
        <source src={url} />
        Your browser does not support video playback.
      </video>
    </div>
  );
};
