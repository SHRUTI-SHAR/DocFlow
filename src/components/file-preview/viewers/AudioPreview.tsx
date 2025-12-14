import React from 'react';
import { Music } from 'lucide-react';

interface AudioPreviewProps {
  url: string;
  fileName: string;
}

export const AudioPreview: React.FC<AudioPreviewProps> = ({ url, fileName }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-8">
      <div className="p-8 bg-primary/10 rounded-full">
        <Music className="h-24 w-24 text-primary" />
      </div>
      <p className="text-lg font-medium text-center">{fileName}</p>
      <audio
        controls
        className="w-full max-w-lg"
        preload="metadata"
      >
        <source src={url} />
        Your browser does not support audio playback.
      </audio>
    </div>
  );
};
