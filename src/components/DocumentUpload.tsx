import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Upload,
  Eye,
  ArrowRight
} from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { UnifiedDocumentUpload } from "./UnifiedDocumentUpload";
import { useDocumentProcessing } from "@/hooks/useDocumentProcessing";
import { toast } from "@/hooks/use-toast";
import type { DocumentData } from "@/types/document";

interface DocumentUploadProps {
  onDocumentProcessed?: (document: any) => void;
  onViewResults?: (document: any) => void;
}

interface ProcessedDocument {
  id: string;
  filename: string;
  storageUrl: string;
  extractedFields: any[];
  confidence: number;
  template?: any;
}

export const DocumentUpload = ({ onDocumentProcessed, onViewResults }: DocumentUploadProps = {}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [processedDocument, setProcessedDocument] = useState<ProcessedDocument | null>(null);
  const { processDocument, isProcessing, steps, resetProcessing } = useDocumentProcessing();

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    // The UnifiedDocumentUpload will handle the file processing
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Upload Your Documents</h2>
          <p className="text-muted-foreground text-lg">
            AI-powered document processing with automatic text extraction and semantic search integration.
          </p>
        </div>

        {/* Upload Area */}
        {!processedDocument && (
          <UnifiedDocumentUpload
            onDocumentProcessed={(documentId) => {
              console.log('Document processed with ID:', documentId);
              // Create a mock processed document for compatibility
              const mockProcessed: ProcessedDocument = {
                id: documentId,
                filename: 'Processed Document',
                storageUrl: '',
                extractedFields: [],
                confidence: 95
              };
              setProcessedDocument(mockProcessed);
              onDocumentProcessed?.(mockProcessed);
            }}
            onComplete={() => {
              // Navigate to document manager or refresh
              if (onViewResults && processedDocument) {
                onViewResults(processedDocument);
              } else {
                window.location.reload();
              }
            }}
          />
        )}

        {/* Processing Pipeline */}
        {isProcessing && steps.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Processing Document</h3>
            <div className="space-y-4">
              {steps.map(step => (
                <div key={step.id} className="flex items-center gap-4 p-4 bg-gradient-card rounded-lg shadow-soft">
                  {getStatusIcon(step.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{step.title}</p>
                      <div className="flex items-center gap-2">
                        {step.duration && (
                          <span className="text-sm text-muted-foreground">
                            {Math.round(step.duration / 1000)}s
                          </span>
                        )}
                        <Badge variant={
                          step.status === 'completed' ? 'default' : 
                          step.status === 'processing' ? 'secondary' : 
                          step.status === 'error' ? 'destructive' : 'outline'
                        }>
                          {step.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                    {step.status === 'processing' && (
                      <Progress value={step.progress} className="h-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Results */}
        {processedDocument && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Document Uploaded Successfully</h3>
              <Badge variant="default" className="bg-success text-success-foreground">
                Saved to Database
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Document Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filename:</span>
                    <span>{processedDocument.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-success">Ready for Search</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={() => setProcessedDocument(null)} variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Another
                </Button>
                <Button 
                  onClick={() => {
                    console.log('View Results clicked', { processedDocument, onViewResults });
                    if (onViewResults) {
                      onViewResults(processedDocument);
                    } else {
                      // Navigate to document manager
                      window.location.href = '/document-manager';
                    }
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View in Document Manager
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>
    </section>
  );
};