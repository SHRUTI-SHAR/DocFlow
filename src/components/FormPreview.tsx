import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  Edit3, 
  Send, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  User,
  Calendar,
  DollarSign
} from "lucide-react";

interface FormField {
  id: string;
  type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'checkbox' | 'select';
  label: string;
  value: string;
  required: boolean;
  confidence: number;
  extracted: boolean;
  validation?: string;
}

interface FormPreviewProps {
  document?: any;
  onFormReady?: () => void;
}

export const FormPreview = ({ document, onFormReady }: FormPreviewProps) => {
  const [viewMode, setViewMode] = useState<'extracted' | 'form'>('extracted');
  
  // Only show if we have a processed document
  if (!document || !document.extractedFields) {
    return null;
  }

  const formFields: FormField[] = document.extractedFields || [];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getFieldIcon = (type: FormField['type']) => {
    switch (type) {
      case 'email':
        return <User className="h-4 w-4" />;
      case 'date':
        return <Calendar className="h-4 w-4" />;
      case 'number':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Generated Form Preview</h2>
          <p className="text-muted-foreground text-lg">
            Review extracted data and generated form structure with confidence scores
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'extracted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('extracted')}
              className="rounded-md"
            >
              <Eye className="mr-2 h-4 w-4" />
              Extracted Data
            </Button>
            <Button
              variant={viewMode === 'form' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('form')}
              className="rounded-md"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Form View
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Document Preview or Extracted Fields */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Document Analysis</h3>
              <Badge variant="secondary" className="bg-success/10 text-success">
                Processing Complete
              </Badge>
            </div>

            {viewMode === 'extracted' ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Fields extracted with AI confidence scores
                </div>
                {formFields.map(field => (
                  <div key={field.id} className="p-4 bg-gradient-card rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getFieldIcon(field.type)}
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getConfidenceColor(field.confidence)}`}>
                          {field.confidence}%
                        </span>
                        {field.confidence >= 90 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">Extracted Value:</div>
                    <div className="font-mono text-sm bg-muted p-2 rounded border">
                      {field.value || 'No value detected'}
                    </div>
                    {field.validation && (
                      <div className="text-xs text-success mt-1">✓ {field.validation}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/50 p-8 rounded-lg text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Original document preview would appear here
                </p>
              </div>
            )}
          </Card>

          {/* Right Column - Generated Form */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Generated Web Form</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Customize
                </Button>
                <Button variant="default" size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Deploy
                </Button>
              </div>
            </div>

            <form className="space-y-6">
              {formFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                    {field.confidence < 90 && (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                  </Label>
                  
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.id}
                      value={field.value}
                      readOnly
                      className="resize-none"
                      rows={3}
                    />
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={field.value === 'true'}
                        disabled
                      />
                      <Label htmlFor={field.id} className="text-sm font-normal">
                        I agree to the terms and conditions
                      </Label>
                    </div>
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type}
                      value={field.value}
                      readOnly
                      className={field.confidence < 90 ? 'border-warning' : ''}
                    />
                  )}
                  
                  {field.confidence < 90 && (
                    <p className="text-xs text-warning">
                      Low confidence ({field.confidence}%) - Please verify
                    </p>
                  )}
                </div>
              ))}

              <Separator />

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Auto-generated from document analysis
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Save Draft
                  </Button>
                  <Button variant="hero">
                    Submit for Review
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        {/* Stats Summary */}
        <Card className="mt-8 p-6 bg-gradient-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-primary mb-1">{formFields.length}</div>
              <div className="text-sm text-muted-foreground">Fields Generated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success mb-1">
                {formFields.filter(f => f.confidence >= 90).length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning mb-1">
                {formFields.filter(f => f.confidence < 90).length}
              </div>
              <div className="text-sm text-muted-foreground">Need Review</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary mb-1">
                {Math.round(formFields.reduce((acc, f) => acc + f.confidence, 0) / formFields.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Confidence</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};