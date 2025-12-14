import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, Contrast, Crop, Zap } from 'lucide-react';
import { DocumentData } from '@/types/workflow';

interface PreprocessStepProps {
  documentData: DocumentData | null;
  onComplete: (data: DocumentData) => void;
  onError: (error: string) => void;
}

export const PreprocessStep: React.FC<PreprocessStepProps> = ({ documentData, onComplete, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    deskew: true,
    denoise: true,
    autoContrast: true,
    autoCrop: true,
    brightness: [50],
    contrast: [50],
    rotation: [0],
  });
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    if (documentData?.originalFile) {
      // Create preview from original file
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(documentData.originalFile);
    }
  }, [documentData]);

  const handleAutoProcess = async () => {
    if (!documentData) return;
    
    setIsProcessing(true);
    try {
      // Simulate preprocessing steps
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const processedData: DocumentData = {
        ...documentData,
        preprocessedImage: previewImage, // In real app, this would be the processed image
      };

      onComplete(processedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Preprocessing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualProcess = async () => {
    if (!documentData) return;
    
    setIsProcessing(true);
    try {
      // Apply manual settings
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const processedData: DocumentData = {
        ...documentData,
        preprocessedImage: previewImage,
      };

      onComplete(processedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No document data available. Please complete the capture step first.</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Preprocessing document...</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Deskewing and straightening</p>
          <p>• Removing noise and artifacts</p>
          <p>• Adjusting contrast and brightness</p>
          <p>• Auto-cropping boundaries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Pre-process Document</h3>
        <p className="text-muted-foreground">
          Optimize your document image for better OCR accuracy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewImage ? (
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={previewImage} 
                  alt="Document preview" 
                  className="w-full h-64 object-contain bg-muted"
                />
              </div>
            ) : (
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No preview available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Processing */}
            <div className="space-y-4">
              <h4 className="font-medium">Automatic Processing</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.deskew}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, deskew: checked }))}
                  />
                  <Label className="text-sm">Auto Deskew</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.denoise}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, denoise: checked }))}
                  />
                  <Label className="text-sm">Denoise</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.autoContrast}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoContrast: checked }))}
                  />
                  <Label className="text-sm">Auto Contrast</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={settings.autoCrop}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCrop: checked }))}
                  />
                  <Label className="text-sm">Auto Crop</Label>
                </div>
              </div>
              <Button onClick={handleAutoProcess} className="w-full" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Auto Process
              </Button>
            </div>

            {/* Manual Adjustments */}
            <div className="space-y-4">
              <h4 className="font-medium">Manual Adjustments</h4>
              
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  Brightness: {settings.brightness[0]}%
                </Label>
                <Slider
                  value={settings.brightness}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, brightness: value }))}
                  max={100}
                  step={1}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  Contrast: {settings.contrast[0]}%
                </Label>
                <Slider
                  value={settings.contrast}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, contrast: value }))}
                  max={100}
                  step={1}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Rotation: {settings.rotation[0]}°
                </Label>
                <Slider
                  value={settings.rotation}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, rotation: value }))}
                  min={-180}
                  max={180}
                  step={1}
                />
              </div>

              <Button onClick={handleManualProcess} variant="outline" className="w-full">
                <Crop className="w-4 h-4 mr-2" />
                Apply Manual Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};