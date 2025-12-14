import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { File, Download, HelpCircle } from 'lucide-react';

interface UnsupportedPreviewProps {
  fileName: string;
  extension: string;
  onDownload: () => void;
}

export const UnsupportedPreview: React.FC<UnsupportedPreviewProps> = ({
  fileName,
  extension,
  onDownload
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
      <div className="p-8 bg-muted rounded-full">
        <File className="h-20 w-20 text-muted-foreground" />
      </div>
      
      <div className="text-center">
        <h3 className="text-xl font-medium mb-2">{fileName}</h3>
        <Badge variant="outline" className="uppercase">
          {extension || 'Unknown Format'}
        </Badge>
      </div>

      <div className="max-w-md text-center space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg text-left">
          <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Preview Not Available</p>
            <p className="text-muted-foreground">
              This file format cannot be previewed in the browser. 
              Download the file to open it with a compatible application.
            </p>
          </div>
        </div>

        <Button onClick={onDownload} size="lg">
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    </div>
  );
};
