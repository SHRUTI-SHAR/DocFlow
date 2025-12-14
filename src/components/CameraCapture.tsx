import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, RotateCcw, Download, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const [isActive, setIsActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to capture documents",
        variant: "destructive"
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setCapturedImage(null);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageUrl);
        
        // Create file from blob
        const file = new File([blob], `document-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        setIsProcessing(false);
        
        toast({
          title: "Document Captured",
          description: "Document photo captured successfully"
        });
        
        // Auto-process after 2 seconds or wait for user confirmation
        setTimeout(() => {
          onCapture(file);
          stopCamera();
          onClose();
        }, 2000);
        
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Failed to capture photo:', error);
      toast({
        title: "Capture Failed",
        description: "Failed to capture document photo",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  }, [onCapture, onClose, stopCamera]);

  const confirmCapture = () => {
    if (capturedImage) {
      // Convert captured image back to file
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `document-${Date.now()}.jpg`, {
                type: 'image/jpeg'
              });
              onCapture(file);
              stopCamera();
              onClose();
            }
          }, 'image/jpeg', 0.9);
        }
      };
      img.src = capturedImage;
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsProcessing(false);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full bg-card border-border">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Document Scanner</h3>
                <p className="text-sm text-muted-foreground">
                  {capturedImage ? 'Review your capture' : 'Position document in frame and capture'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
            {!isActive && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <Button onClick={startCamera} variant="default" size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Start Camera
                  </Button>
                </div>
              </div>
            )}
            
            {isActive && !capturedImage && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Document frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-4/5 border-2 border-primary rounded-lg relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-primary rounded-tl-lg"></div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-primary rounded-tr-lg"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-primary rounded-bl-lg"></div>
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-primary rounded-br-lg"></div>
                    
                    <div className="absolute top-2 left-2 right-2 text-center">
                      <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
                        Position document within frame
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full h-full object-cover"
              />
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Processing capture...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-6">
            {!capturedImage ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  disabled={!isActive || isProcessing}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Document
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retakePhoto}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                
                <div className="flex gap-3">
                  <Button variant="outline" onClick={confirmCapture}>
                    <Download className="mr-2 h-4 w-4" />
                    Save & Process
                  </Button>
                  
                  <Button onClick={confirmCapture} size="lg">
                    <Check className="mr-2 h-5 w-5" />
                    Use This Photo
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};