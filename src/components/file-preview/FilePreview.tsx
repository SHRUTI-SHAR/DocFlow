import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  X, 
  Download, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileCode,
  FileArchive,
  File,
  ExternalLink,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { getFileCategory, getFileExtension, FILE_CATEGORIES } from './fileCategories';
import { PDFPreview } from './viewers/PDFPreview';
import { ImagePreview } from './viewers/ImagePreview';
import { VideoPreview } from './viewers/VideoPreview';
import { AudioPreview } from './viewers/AudioPreview';
import { CodePreview } from './viewers/CodePreview';
import { TextPreview } from './viewers/TextPreview';
import { OfficePreview } from './viewers/OfficePreview';
import { ArchivePreview } from './viewers/ArchivePreview';
import { UnsupportedPreview } from './viewers/UnsupportedPreview';

interface FilePreviewProps {
  fileUrl?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storagePath?: string;
  isOpen?: boolean;
  onClose?: () => void;
  showInModal?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  storagePath,
  isOpen = true,
  onClose,
  showInModal = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const extension = useMemo(() => getFileExtension(fileName), [fileName]);
  const category = useMemo(() => getFileCategory(fileName, fileType), [fileName, fileType]);

  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (fileUrl) {
          setResolvedUrl(fileUrl);
        } else if (storagePath) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(storagePath, 3600);
          
          if (data?.signedUrl) {
            setResolvedUrl(data.signedUrl);
          } else {
            throw new Error('Could not generate preview URL');
          }
        } else {
          throw new Error('No file URL or storage path provided');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [fileUrl, storagePath]);

  const handleDownload = async () => {
    if (!resolvedUrl) return;
    
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'code': return <FileCode className="h-4 w-4" />;
      case 'archive': return <FileArchive className="h-4 w-4" />;
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4">
            <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <p className="text-lg font-medium">Preview Unavailable</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (!resolvedUrl) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <p className="text-muted-foreground">No preview available</p>
        </div>
      );
    }

    switch (category) {
      case 'image':
        return (
          <ImagePreview 
            url={resolvedUrl} 
            fileName={fileName} 
            zoom={zoom} 
            rotation={rotation} 
          />
        );
      case 'video':
        return <VideoPreview url={resolvedUrl} fileName={fileName} />;
      case 'audio':
        return <AudioPreview url={resolvedUrl} fileName={fileName} />;
      case 'pdf':
        return <PDFPreview url={resolvedUrl} fileName={fileName} />;
      case 'code':
        return <CodePreview url={resolvedUrl} fileName={fileName} extension={extension} />;
      case 'text':
        return <TextPreview url={resolvedUrl} fileName={fileName} />;
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        return <OfficePreview url={resolvedUrl} fileName={fileName} category={category} />;
      case 'archive':
        return <ArchivePreview fileName={fileName} fileSize={fileSize} />;
      default:
        return <UnsupportedPreview fileName={fileName} extension={extension} onDownload={handleDownload} />;
    }
  };

  const content = (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg">
            {getCategoryIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{fileName}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="uppercase text-xs">
                {extension || 'Unknown'}
              </Badge>
              <span>{formatFileSize(fileSize)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls for images */}
          {category === 'image' && (
            <>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate">
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}

          <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        {renderPreview()}
      </div>
    </div>
  );

  if (showInModal) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <DialogContent className="max-w-5xl h-[90vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      {content}
    </Card>
  );
};

export default FilePreview;
