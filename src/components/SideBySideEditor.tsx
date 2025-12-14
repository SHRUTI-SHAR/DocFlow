import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { 
  FileText, 
  Edit3, 
  Save, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface FormField {
  id: string;
  type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'checkbox' | 'select';
  label: string;
  value: string;
  required: boolean;
  confidence: number;
  validation?: string;
  options?: string[];
  position?: { x: number; y: number; width: number; height: number };
}

interface SideBySideEditorProps {
  documentUrl?: string;
  documentData?: string;
  formFields: FormField[];
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onSave: () => void;
  isProcessing?: boolean;
}

export const SideBySideEditor = ({ 
  documentUrl, 
  documentData,
  formFields, 
  onFieldUpdate, 
  onSave,
  isProcessing = false
}: SideBySideEditorProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize form values from fields
    const initialValues: Record<string, any> = {};
    formFields.forEach(field => {
      initialValues[field.id] = field.value || '';
    });
    setFormValues(initialValues);
  }, [formFields]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const updateFormValue = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    onFieldUpdate(fieldId, { value: String(value) });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const renderFormField = (field: FormField) => {
    const isSelected = selectedField === field.id;
    const fieldValue = formValues[field.id] || '';

    return (
      <div 
        key={field.id}
        className={`space-y-2 p-3 rounded-lg border transition-all ${
          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onClick={() => setSelectedField(field.id)}
      >
        <div className="flex items-center justify-between">
          <Label htmlFor={field.id} className="flex items-center gap-2 font-medium">
            {field.label}
            {field.required && <span className="text-destructive text-xs">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getConfidenceColor(field.confidence)}`}>
              {Math.round(field.confidence)}%
            </span>
            {field.confidence >= 90 ? (
              <CheckCircle2 className="h-3 w-3 text-success" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-warning" />
            )}
          </div>
        </div>

        {field.type === 'textarea' ? (
          <Textarea
            id={field.id}
            value={fieldValue}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className={`resize-none ${field.confidence < 75 ? 'border-warning' : ''}`}
            rows={3}
          />
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id={field.id}
              checked={fieldValue === 'true' || fieldValue === true}
              onCheckedChange={(checked) => updateFormValue(field.id, checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.validation || 'I agree to this condition'}
            </Label>
          </div>
        ) : field.type === 'select' && field.options ? (
          <select
            id={field.id}
            value={fieldValue}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select an option</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <Input
            id={field.id}
            type={field.type}
            value={fieldValue}
            onChange={(e) => updateFormValue(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            className={field.confidence < 75 ? 'border-warning' : ''}
          />
        )}

        {field.confidence < 75 && (
          <p className="text-xs text-warning">
            Low confidence - Please verify this field
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-200px)] w-full">
      <ResizablePanelGroup direction="horizontal" className="min-h-full border rounded-lg">
        {/* Document Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Document Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Original Document</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[50px] text-center">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <div 
                ref={documentRef}
                className="mx-auto bg-white shadow-lg"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.3s ease'
                }}
              >
                {documentUrl ? (
                  <img 
                    src={documentUrl} 
                    alt="Document" 
                    className="w-full h-auto"
                    onLoad={() => console.log('Document loaded')}
                  />
                ) : documentData ? (
                  <img 
                    src={`data:image/jpeg;base64,${documentData}`}
                    alt="Document" 
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No document loaded</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Form Panel */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            {/* Form Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <span className="font-medium">Generated Form</span>
                {formFields.length > 0 && (
                  <Badge variant="secondary">
                    {formFields.length} fields
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={onSave} size="sm" disabled={isProcessing}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Form
                </Button>
              </div>
            </div>

            {/* Form Editor */}
            <div className="flex-1 overflow-auto p-6">
              {formFields.length > 0 ? (
                <div className="space-y-6">
                  {/* Form Header */}
                  <div className="text-center pb-4 border-b">
                    <h3 className="text-xl font-semibold mb-2">Auto-Generated Form</h3>
                    <p className="text-muted-foreground text-sm">
                      Fields extracted from your document • Click fields to edit
                    </p>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    {formFields.map(renderFormField)}
                  </div>

                  <Separator />

                  {/* Form Actions */}
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                      {formFields.filter(f => f.confidence >= 90).length} high confidence fields
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                      <Button variant="hero" size="sm">
                        Deploy Form
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium mb-2">Processing Document</h3>
                  <p className="text-muted-foreground">
                    AI is analyzing your document and generating form fields...
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Edit3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Form Generated</h3>
                  <p className="text-muted-foreground">
                    Upload and process a document to auto-generate form fields
                  </p>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};