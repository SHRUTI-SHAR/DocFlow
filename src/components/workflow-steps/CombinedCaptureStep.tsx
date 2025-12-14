import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Camera, FileText, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { useDocumentProcessing } from '@/hooks/useDocumentProcessing';
import { DocumentData } from '@/types/workflow';
import { useToast } from "@/hooks/use-toast";

interface CombinedCaptureStepProps {
  onComplete: (data: DocumentData) => void;
  onError: () => void;
}

export const CombinedCaptureStep: React.FC<CombinedCaptureStepProps> = ({
  onComplete,
  onError
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [preprocessStatus, setPreprocessStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processDocument } = useDocumentProcessing();
  const { toast } = useToast();

  const handleFileSelection = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPEG, PNG, WebP) or PDF file.",
        variant: "destructive",
      });
      onError();
      return;
    }

    // File size validation removed - no limit

    setUploadedFile(file);
    setCaptureStatus('processing');

    try {
      // Step 1: Capture (file upload/processing)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        
        setCaptureStatus('completed');
        setPreprocessStatus('processing');

        try {
          // Step 2: Preprocess (image enhancement and optimization)
          // For now, we'll use the original file as preprocessed
          // In a real implementation, this would enhance image quality, adjust contrast, etc.
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate preprocessing
          
          setPreprocessedImage(result);
          setPreprocessStatus('completed');

          // Create document data with both capture and preprocess completed
          const documentData: DocumentData = {
            id: `doc_${Date.now()}`,
            filename: file.name,
            originalFile: file,
            preprocessedImage: result,
            extractedFields: [],
            confidence: 0,
          };

          toast({
            title: "Document captured and preprocessed",
            description: `${file.name} is ready for understanding phase.`,
          });

          onComplete(documentData);
        } catch (error) {
          console.error('Preprocessing failed:', error);
          setPreprocessStatus('error');
          toast({
            title: "Preprocessing failed",
            description: "Failed to preprocess the document. Please try again.",
            variant: "destructive",
          });
          onError();
        }
      };
      
      reader.onerror = () => {
        setCaptureStatus('error');
        toast({
          title: "File read error",
          description: "Failed to read the uploaded file.",
          variant: "destructive",
        });
        onError();
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Capture failed:', error);
      setCaptureStatus('error');
      onError();
    }
  }, [processDocument, toast, onComplete, onError]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelection(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelection(file);
    }
    // Always reset input to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const getStatusIcon = (status: typeof captureStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'processing':
        return <Settings className="w-5 h-5 text-warning animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status indicators */}
      <div className="flex justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span className="text-sm font-medium">Capture</span>
          {getStatusIcon(captureStatus)}
          <Badge variant={captureStatus === 'completed' ? 'default' : 'secondary'}>
            {captureStatus}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Preprocess</span>
          {getStatusIcon(preprocessStatus)}
          <Badge variant={preprocessStatus === 'completed' ? 'default' : 'secondary'}>
            {preprocessStatus}
          </Badge>
        </div>
      </div>

      {!uploadedFile && (
        <Card
          className={`border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-primary/50 ${
            isDragOver 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:bg-accent/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Document</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Drag and drop your document here, or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: PDF, JPG, PNG, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInputChange}
            />
          </CardContent>
        </Card>
      )}

      {uploadedFile && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">{uploadedFile.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {captureStatus === 'processing' && (
                  <p className="text-sm text-warning">Processing document...</p>
                )}
                
                {captureStatus === 'completed' && preprocessStatus === 'processing' && (
                  <p className="text-sm text-warning">Preprocessing image...</p>
                )}
                
                {preprocessStatus === 'completed' && (
                  <p className="text-sm text-success">✓ Ready for understanding phase</p>
                )}
              </div>
            </div>

            {preprocessedImage && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Preprocessed Preview:</h5>
                <img 
                  src={preprocessedImage} 
                  alt="Preprocessed document"
                  className="max-w-full h-48 object-contain border rounded-lg bg-muted"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {captureStatus === 'error' || preprocessStatus === 'error' && (
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              setCaptureStatus('idle');
              setPreprocessStatus('idle');
              setUploadedFile(null);
              setPreprocessedImage(null);
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};