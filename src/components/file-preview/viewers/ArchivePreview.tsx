import React from 'react';
import { FileArchive, Package, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArchivePreviewProps {
  fileName: string;
  fileSize?: number;
}

export const ArchivePreview: React.FC<ArchivePreviewProps> = ({ fileName, fileSize }) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
      <div className="p-8 bg-amber-500/10 rounded-full">
        <FileArchive className="h-20 w-20 text-amber-500" />
      </div>
      
      <div className="text-center">
        <h3 className="text-xl font-medium mb-2">{fileName}</h3>
        <Badge variant="outline" className="mb-4">{formatFileSize(fileSize)}</Badge>
      </div>

      <div className="max-w-md text-center space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-left">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Archive Preview</p>
            <p className="text-muted-foreground">
              Archive files cannot be previewed directly in the browser. 
              Download the file to view its contents.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-left">
          <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Supported Archive Formats</p>
            <p className="text-muted-foreground">
              ZIP, RAR, 7Z, TAR, GZ, BZ2, XZ, ISO, DMG, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
