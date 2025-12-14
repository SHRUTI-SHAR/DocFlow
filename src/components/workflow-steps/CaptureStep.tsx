import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Camera, FileText, Loader2 } from 'lucide-react';
import { DocumentData } from '@/types/workflow';
import { CameraCapture } from '../CameraCapture';

interface CaptureStepProps {
  onComplete: (data: DocumentData) => void;
  onError: (error: string) => void;
}

export const CaptureStep: React.FC<CaptureStepProps> = ({ onComplete, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const documentData: DocumentData = {
        id: crypto.randomUUID(),
        filename: file.name,
        originalFile: file,
        extractedFields: [],
        confidence: 0,
      };

      onComplete(documentData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
      // Always reset input to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false);
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const documentData: DocumentData = {
        id: crypto.randomUUID(),
        filename: file.name,
        originalFile: file,
        extractedFields: [],
        confidence: 0,
      };

      onComplete(documentData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Camera capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setIsProcessing(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const documentData: DocumentData = {
          id: crypto.randomUUID(),
          filename: file.name,
          originalFile: file,
          extractedFields: [],
          confidence: 0,
        };

        onComplete(documentData);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Processing your document...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload or Capture Document</h3>
        <p className="text-muted-foreground">
          Choose how you'd like to provide your document for processing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File Upload */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Upload File</h4>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, or Image files
                  </p>
                </div>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Camera Capture */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCamera(true)}>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Scan Document</h4>
                <p className="text-sm text-muted-foreground">
                  Use camera to capture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drag & Drop */}
        <Card 
          className="border-dashed border-2 hover:border-primary/50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Drag & Drop</h4>
                <p className="text-sm text-muted-foreground">
                  Drop files here to upload
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supported Formats */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG
        </p>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};