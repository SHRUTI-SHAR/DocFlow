import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Search, 
  Zap, 
  CheckCircle2,
  AlertTriangle,
  Save,
  Play,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// Use Vite to resolve the worker URL for pdf.js
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DocumentAnalysisService } from "@/services/documentAnalysis";
import { TemplateLearningService } from "@/services/templateLearning";
// Configure pdf.js worker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(GlobalWorkerOptions as any).workerSrc = pdfWorker;

interface DetectedField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'checkbox';
  value: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  suggested: boolean;
}

interface UnknownFormHandlerProps {
  documentData?: string; // base64 document data
  onClose: () => void;
  onTemplateCreated: (template: any) => void;
  onEditTemplate?: (templateData: any, documentData: string) => void; // New prop for editing
}

export const UnknownFormHandler = ({ documentData, onClose, onTemplateCreated, onEditTemplate }: UnknownFormHandlerProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'review' | 'editing'>('upload');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedDocumentData, setProcessedDocumentData] = useState<string | null>(null);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Real document analysis with liteLLM - only run once per document
  useEffect(() => {
    if (currentStep === 'analyzing' && (documentData || uploadedFile) && !isAnalyzing && !hasAnalyzed) {
      setHasAnalyzed(true);
      analyzeDocument();
    }
  }, [currentStep, documentData, uploadedFile, isAnalyzing, hasAnalyzed]);

const MAX_DATAURL_BYTES = 6_000_000; // ~6MB safety cap

const ensureUnderLimit = (dataUrl: string) => dataUrl.length <= MAX_DATAURL_BYTES;

const compressImageFile = async (file: File): Promise<string> => {
  const baseUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = new Image();
  const dataUrl: string = await new Promise((resolve, reject) => {
    img.onload = () => resolve(baseUrl);
    img.onerror = reject;
    img.src = baseUrl;
  });

  // draw to canvas with max dimension
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (!ensureUnderLimit(out) && quality > 0.4) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
};

const pdfToImageDataUrl = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.6 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await (page as any).render({ canvasContext: ctx, viewport } as any).promise;

  // downscale if needed
  const maxW = 1600;
  let outCanvas = canvas;
  if (canvas.width > maxW) {
    const scale = maxW / canvas.width;
    const tmp = document.createElement('canvas');
    tmp.width = Math.floor(canvas.width * scale);
    tmp.height = Math.floor(canvas.height * scale);
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
    outCanvas = tmp;
  }
  let quality = 0.85;
  let out = outCanvas.toDataURL('image/jpeg', quality);
  while (!ensureUnderLimit(out) && quality > 0.4) {
    quality -= 0.1;
    out = outCanvas.toDataURL('image/jpeg', quality);
  }
  return out;
};

const convertFileToBase64 = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    return pdfToImageDataUrl(file);
  }
  if (file.type.startsWith('image/')) {
    return compressImageFile(file);
  }
  // Fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const analyzeDocument = async () => {
  if (!documentData && !uploadedFile) return;
  
  setIsAnalyzing(true);
  console.log('Starting document analysis with liteLLM...');
  
  try {
    // Use existing documentData or convert file to base64
    let docData = documentData;
    if (!docData && uploadedFile) {
      docData = await convertFileToBase64(uploadedFile);
    }
    
    if (!docData) {
      throw new Error('No document data available for analysis');
    }
    
    // Store the processed document data for later use
    setProcessedDocumentData(docData);
    
    // Simulate progress while waiting for AI response
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          return prev; // Cap at 90% until we get response
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Unified analysis via DocumentAnalysisService (Edge Function)
    const analysisService = DocumentAnalysisService.getInstance();
    const analysis = await analysisService.detectFields(docData, 'unknown_form');

    clearInterval(progressInterval);

    console.log('Analysis result:', analysis);

    if (analysis && (analysis as any).fields) {
      // Convert AI response to our field format
      const aiFields = (analysis as any).fields.map((field: any, index: number) => ({
        id: (index + 1).toString(),
        label: field.label || `Field ${index + 1}`,
        type: field.type || 'text',
        value: field.value || '',
        confidence: field.confidence || 75,
        x: field.position?.x || 150,
        y: field.position?.y || (120 + index * 60),
        width: field.position?.width || 200,
        height: field.position?.height || 32,
        suggested: field.suggested !== false && field.confidence > 80
      }));
      
      setDetectedFields(aiFields);
      setAnalysisProgress(100);
      setCurrentStep('review');
      
      toast({
        title: "Analysis complete",
        description: `Detected ${aiFields.length} fields in the document`,
      });
    } else {
      throw new Error('No fields detected in the document');
    }
  } catch (error) {
    console.error('Document analysis failed:', error);
    
    toast({
      title: "Analysis failed",
      description: error instanceof Error ? error.message : 'Failed to analyze document',
      variant: "destructive",
    });
    
    setCurrentStep('upload');
    setAnalysisProgress(0);
  } finally {
    setIsAnalyzing(false);
  }
};

const handleFileUpload = (file?: File) => {
  if (file) {
    setUploadedFile(file);
  }
  // Reset analysis state for new document
  setHasAnalyzed(false);
  setDetectedFields([]);
  
  // If we already have documentData from props, use it directly
  if (documentData || file) {
    setCurrentStep('analyzing');
    setAnalysisProgress(0);
    toast({
      title: "Document uploaded",
      description: "Starting AI analysis with liteLLM proxy...",
    });
  }
};

  const handleFieldToggle = (fieldId: string) => {
    setDetectedFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { ...field, suggested: !field.suggested }
        : field
    ));
  };

  const handleFieldUpdate = (fieldId: string, updates: Partial<DetectedField>) => {
    setDetectedFields(prev => prev.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for this template",
        variant: "destructive",
      });
      return;
    }

    const selectedFields = detectedFields.filter(f => f.suggested);
    
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field for the template",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create template directly without enhancement
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        description: templateDescription,
        version: '1.0',
        status: 'draft',
        fields: selectedFields,
        fieldsCount: selectedFields.length,
        usageCount: 0,
        accuracy: Math.round(selectedFields.reduce((acc, f) => acc + f.confidence, 0) / selectedFields.length),
        documentType: 'Unknown Form',
        createdBy: 'System AI',
        lastModified: new Date().toISOString().split('T')[0],
        metadata: {
          document_image: processedDocumentData || documentData || null
        }
      };

      // Initialize learning data for the new template
      const learningService = TemplateLearningService.getInstance();
      await learningService.logTemplateUsage(newTemplate.id, 'template_created_from_unknown_document', true, 0.8);

      onTemplateCreated(newTemplate);
      
      toast({
        title: "Enhanced template created successfully",
        description: `${templateName} has been created with AI enhancements and is ready for use`,
      });
    } catch (error) {
      console.error('Failed to enhance template:', error);
      
      // Fallback: create basic template without enhancements
      const basicTemplate = {
        id: Date.now().toString(),
        name: templateName,
        description: templateDescription,
        version: '1.0',
        status: 'draft',
        fields: selectedFields,
        fieldsCount: selectedFields.length,
        usageCount: 0,
        accuracy: Math.round(selectedFields.reduce((acc, f) => acc + f.confidence, 0) / selectedFields.length),
        documentType: 'Unknown Form',
        createdBy: 'System AI',
        lastModified: new Date().toISOString().split('T')[0],
        metadata: {
          document_image: processedDocumentData || documentData || null
        }
      };

      onTemplateCreated(basicTemplate);
      
      toast({
        title: "Template created",
        description: `${templateName} has been created (enhancement failed but template is still functional)`,
      });
    }
  };

  const handleFinetuneTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for this template",
        variant: "destructive",
      });
      return;
    }

    const selectedFields = detectedFields.filter(f => f.suggested);
    
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field for the template",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      id: `temp-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      version: '1.0',
      status: 'draft',
      fields: selectedFields,
      fieldsCount: selectedFields.length,
      usageCount: 0,
      accuracy: Math.round(selectedFields.reduce((acc, f) => acc + f.confidence, 0) / selectedFields.length),
      documentType: 'Unknown Form',
      createdBy: 'System AI',
      lastModified: new Date().toISOString().split('T')[0]
    };

    // Use processedDocumentData (which contains the document image)
    const docData = processedDocumentData || documentData;
    if (onEditTemplate && docData) {
      onEditTemplate(templateData, docData);
    } else {
      toast({
        title: "No document data",
        description: "Cannot open editor without document data",
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const renderUploadStep = () => (
    <Card className="p-12 text-center">
      <Upload className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
      <h3 className="text-2xl font-semibold mb-4">Upload Unknown Document</h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Upload a document that doesn't match any existing templates. Our liteLLM AI will analyze it and suggest field locations.
      </p>
      <div className="space-y-4">
        <Button 
          variant="hero" 
          size="lg" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-5 w-5" />
          Choose Document
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
            // Always reset input to allow selecting the same file again
            if (e.target) {
              e.target.value = '';
            }
          }}
          className="hidden"
        />
        <p className="text-sm text-muted-foreground">
          Supports PDF, PNG, JPG, and other document formats
        </p>
      </div>
    </Card>
  );

  const renderAnalyzingStep = () => (
    <Card className="p-12 text-center">
      <div className="animate-spin h-16 w-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
      <h3 className="text-2xl font-semibold mb-4">Analyzing Document</h3>
      <p className="text-muted-foreground mb-8">
        AI is detecting form fields, analyzing layout, and identifying data patterns...
      </p>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Analysis Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(analysisProgress)}%</span>
        </div>
        <Progress value={analysisProgress} className="h-3 mb-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-sm">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          OCR Processing
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Zap className="h-4 w-4" />
          Field Detection
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          Layout Analysis
        </div>
      </div>
    </Card>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Template Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Template Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Customer Service Form"
            />
          </div>
          <div>
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of this form type"
            />
          </div>
        </div>
      </Card>

      {/* Analysis Results */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">AI-Detected Fields</h3>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-success/10 text-success">
              {detectedFields.filter(f => f.suggested).length} selected
            </Badge>
            <Badge variant="outline">
              {detectedFields.length} total detected
            </Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-analyze
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detectedFields.map(field => (
            <div 
              key={field.id} 
              className={`p-4 border rounded-lg transition-smooth cursor-pointer ${
                field.suggested 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => handleFieldToggle(field.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.suggested}
                    onChange={() => handleFieldToggle(field.id)}
                    className="rounded border-border"
                  />
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {field.type} field
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getConfidenceColor(field.confidence)}`}>
                    {Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}%
                  </div>
                  <div className="text-xs text-muted-foreground">confidence</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">Detected Value:</div>
              <div className="font-mono text-sm bg-muted p-2 rounded border">
                {field.value || 'No value detected'}
              </div>
              
              {field.confidence < 80 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Low confidence - may need manual adjustment
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleFinetuneTemplate}>
            <Play className="mr-2 h-4 w-4" />
            Fine-tune Template
          </Button>
          <Button variant="hero" onClick={handleCreateTemplate}>
            <Save className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>
    </div>
  );

  const renderEditingStep = () => (
    <div className="space-y-6">
      {/* Template Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Fine-tune Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="template-name-edit">Template Name *</Label>
            <Input
              id="template-name-edit"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Customer Service Form"
            />
          </div>
          <div>
            <Label htmlFor="template-description-edit">Description</Label>
            <Input
              id="template-description-edit"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Brief description of this form type"
            />
          </div>
        </div>
      </Card>

      {/* Field Editor */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Edit Template Fields</h3>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {detectedFields.length} fields total
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const newField = {
                  id: (detectedFields.length + 1).toString(),
                  label: `New Field ${detectedFields.length + 1}`,
                  type: 'text' as const,
                  value: '',
                  confidence: 100,
                  x: 150,
                  y: 120 + detectedFields.length * 60,
                  width: 200,
                  height: 32,
                  suggested: true
                };
                setDetectedFields([...detectedFields, newField]);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {detectedFields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={`field-label-${field.id}`}>Field Label</Label>
                  <Input
                    id={`field-label-${field.id}`}
                    value={field.label}
                    onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                    placeholder="Enter field label"
                  />
                </div>
                <div>
                  <Label htmlFor={`field-type-${field.id}`}>Field Type</Label>
                  <select
                    id={`field-type-${field.id}`}
                    value={field.type}
                    onChange={(e) => handleFieldUpdate(field.id, { type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor={`field-value-${field.id}`}>Default Value</Label>
                  <Input
                    id={`field-value-${field.id}`}
                    value={field.value}
                    onChange={(e) => handleFieldUpdate(field.id, { value: e.target.value })}
                    placeholder="Default value"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.suggested}
                      onChange={() => handleFieldToggle(field.id)}
                      className="rounded border-border"
                    />
                    <Label className="text-sm">Include</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDetectedFields(prev => prev.filter(f => f.id !== field.id));
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Confidence: {Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}%</span>
                <span>Position: ({field.x}, {field.y})</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('review')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleCreateTemplate}>
            <Save className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Templates
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Unknown Form Handler</h1>
              <p className="text-sm text-muted-foreground">
                Create template from unrecognized document
              </p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="hidden md:flex items-center gap-4">
            {[
              { step: 'upload', label: 'Upload', icon: Upload },
              { step: 'analyzing', label: 'Analyze', icon: Search },
              { step: 'review', label: 'Review', icon: CheckCircle2 }
            ].map(({ step, label, icon: Icon }, index) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${
                  currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ['upload', 'analyzing', 'review'].indexOf(currentStep)
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{label}</span>
                {index < 2 && <div className="w-8 h-px bg-border ml-2"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'analyzing' && renderAnalyzingStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'editing' && renderEditingStep()}
      </div>
    </div>
  );
};