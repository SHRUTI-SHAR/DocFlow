import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, FileText, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import type { DocumentData } from "@/types/document";

interface DocumentUploadAreaProps {
  onFileUploaded: (document: DocumentData) => void;
  onCameraClick: () => void;
  disabled?: boolean;
}

export const DocumentUploadArea = ({ onFileUploaded, onCameraClick, disabled }: DocumentUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    isProcessing, 
    dragActive, 
    handleDrag, 
    handleDrop, 
    handleFileInput 
  } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selected:', e.target.files?.[0]?.name);
    const documentData = await handleFileInput(e);
    if (documentData) {
      console.log('Document data processed:', documentData.name);
      onFileUploaded(documentData);
    }
    // Always reset input to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    const documentData = await handleDrop(e);
    if (documentData) {
      onFileUploaded(documentData);
    }
  };

  return (
    <Card 
      className={`border-2 border-dashed transition-all duration-200 ${
        dragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:border-primary/50'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleFileDrop}
    >
      <div className="p-12 text-center">
        <div className="flex justify-center mb-6">
          {isProcessing ? (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          ) : (
            <div className="relative">
              <Upload className="h-16 w-16 text-muted-foreground" />
              {dragActive && (
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
              )}
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold mb-2">
          {isProcessing ? 'Processing Document...' : 'Upload Your Document'}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {dragActive 
            ? 'Drop your file here'
            : 'Drag and drop your file here, or choose from the options below'
          }
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="hero" 
            onClick={() => {
              console.log('Choose File button clicked');
              console.log('File input ref:', fileInputRef.current);
              fileInputRef.current?.click();
            }}
            disabled={isProcessing || disabled}
            className="flex items-center gap-2"
            type="button"
          >
            <FileText className="h-4 w-4" />
            Choose File
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCameraClick}
            disabled={isProcessing || disabled}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Scan with Camera
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: PDF, JPG, PNG, WEBP
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing || disabled}
        />
      </div>
    </Card>
  );
};