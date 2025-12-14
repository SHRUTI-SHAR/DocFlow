import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { FileCategory } from '../fileCategories';

interface OfficePreviewProps {
  url: string;
  fileName: string;
  category: FileCategory;
}

export const OfficePreview: React.FC<OfficePreviewProps> = ({ url, fileName, category }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Use Microsoft Office Online viewer or Google Docs Viewer
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  const getCategoryLabel = () => {
    switch (category) {
      case 'document': return 'Word Document';
      case 'spreadsheet': return 'Excel Spreadsheet';
      case 'presentation': return 'PowerPoint Presentation';
      default: return 'Office Document';
    }
  };

  const getCategoryIcon = () => {
    return <FileText className="h-16 w-16 text-primary" />;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
        {getCategoryIcon()}
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">{getCategoryLabel()}</h3>
          <p className="text-muted-foreground mb-6">
            Unable to preview this file in the browser.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <a href={viewerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Office Online
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={googleViewerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Docs
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={viewerUrl}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
        title={fileName}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
};
