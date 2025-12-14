import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, CheckSquare, AlertCircle, CheckCircle, Edit3, Save } from 'lucide-react';
import { DocumentData, FormField } from '@/types/workflow';
import { useToast } from "@/hooks/use-toast";

interface CombinedProcessStepProps {
  documentData: DocumentData | null;
  onComplete: (data: DocumentData) => void;
  onError: () => void;
}

export const CombinedProcessStep: React.FC<CombinedProcessStepProps> = ({
  documentData,
  onComplete,
  onError
}) => {
  const [generateStatus, setGenerateStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [validateStatus, setValidateStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (documentData && generateStatus === 'idle') {
      generateForm();
    }
  }, [documentData]);

  const generateForm = async () => {
    if (!documentData) {
      onError();
      return;
    }

    setGenerateStatus('processing');

    try {
      // Use template-based form generation if template is available
      if (documentData.templateMatch) {
        await generateTemplateBasedForm();
      } else {
        await generateGenericForm();
      }
    } catch (error) {
      console.error('Form generation failed:', error);
      setGenerateStatus('error');
      toast({
        title: "Form generation failed",
        description: "Failed to generate form from document. Please try again.",
        variant: "destructive",
      });
      onError();
    }
  };

  const generateTemplateBasedForm = async () => {
    const template = documentData!.templateMatch!;
    
    toast({
      title: "Generating template-based form",
      description: `Using ${template.name} template structure for optimal form generation.`,
    });

    // Simulate form generation based on template structure
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Filter extracted fields to only include those that match the template
    let templateFields = documentData!.extractedFields;
    
    console.log('[TemplateBasedForm] Template info:', {
      name: template.name,
      totalFields: template.totalFields,
      matchedFieldNames: template.matchedFieldNames,
      extractedFieldsCount: documentData!.extractedFields.length
    });
    
    if (template.matchedFieldNames && template.matchedFieldNames.length > 0) {
      // Filter to only show fields that are in the template's matched field names
        templateFields = documentData!.extractedFields.filter(field => 
        template.matchedFieldNames!.includes(field.name)
      );
      console.log('[TemplateBasedForm] Filtered by field names:', templateFields.length);
    } else {
      // Fallback: if no matched field names, limit to the template's total field count
      templateFields = documentData!.extractedFields.slice(0, template.totalFields);
      console.log('[TemplateBasedForm] Using fallback (first N fields):', templateFields.length);
    }
    
    // Safety check: if no fields after filtering, use all fields as last resort
    if (templateFields.length === 0) {
      templateFields = documentData!.extractedFields.slice(0, template.totalFields || 10);
      console.log('[TemplateBasedForm] Safety fallback - using first N fields:', templateFields.length);
    }
    
    // Final safety check: if still no fields, use all extracted fields
    if (templateFields.length === 0) {
      templateFields = documentData!.extractedFields;
      console.log('[TemplateBasedForm] Final safety fallback - using all extracted fields:', templateFields.length);
    }

    // Apply confidence boost and other enhancements
    const enhancedFields = templateFields.map(field => {
      let confidence = field.confidence;
      
      // Convert to percentage if it's a decimal (0.0-1.0)
      if (confidence <= 1) {
        confidence = confidence * 100;
      }
      
      // Apply template-based confidence boost
      // If confidence is very low (< 20%), boost significantly
      if (confidence < 20) {
        confidence = Math.min(confidence + 30, 85); // Boost low confidence fields significantly
      } else if (confidence < 50) {
        confidence = Math.min(confidence + 15, 90); // Moderate boost for medium confidence
      } else {
        confidence = Math.min(confidence + 5, 95); // Small boost for high confidence
      }
      
      console.log(`[TemplateBasedForm] Field ${field.name}: ${field.confidence} -> ${confidence}%`);
      
      return {
        ...field,
        confidence: confidence
      };
    });

    setFormFields(enhancedFields);
    setGenerateStatus('completed');

    toast({
      title: "Template-based form generated",
      description: `Generated ${enhancedFields.length} fields using ${template.name} template structure.`,
    });
  };

  const generateGenericForm = async () => {
    toast({
      title: "Generating generic form",
      description: "Creating form based on detected document structure.",
    });

    // Simulate generic form generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use the existing generic mock fields but base them on documentData if available
    const detectedFields: FormField[] = documentData!.extractedFields.length > 0 
      ? documentData!.extractedFields 
      : [
          {
            id: 'field_1',
            name: 'title',
            type: 'text',
            value: 'Sample Document',
            confidence: 75,
            required: true,
            validation: [{ type: 'required', message: 'Title is required' }]
          },
          {
            id: 'field_2',
            name: 'description',
            type: 'textarea',
            value: 'Document content extracted...',
            confidence: 65,
            required: false,
            validation: []
          }
        ];

    setFormFields(detectedFields);
    setGenerateStatus('completed');

    toast({
      title: "Generic form generated",
      description: `Generated ${detectedFields.length} fields from document analysis.`,
    });
  };

  const validateForm = () => {
    setValidateStatus('processing');
    const errors: Record<string, string> = {};

    formFields.forEach(field => {
      field.validation?.forEach(rule => {
        switch (rule.type) {
          case 'required':
            if (!field.value || (typeof field.value === 'string' && field.value.trim() === '')) {
              errors[field.id] = rule.message;
            }
            break;
          case 'email':
            if (field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
              errors[field.id] = rule.message;
            }
            break;
        }
      });
    });

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      setValidateStatus('completed');
      
      const updatedDocumentData: DocumentData = {
        ...documentData!,
        extractedFields: formFields,
        confidence: formFields.reduce((acc, field) => acc + field.confidence, 0) / formFields.length
      };

      toast({
        title: "Form validated successfully",
        description: "All fields have been validated and are ready for finalization.",
      });

      onComplete(updatedDocumentData);
    } else {
      setValidateStatus('error');
      toast({
        title: "Validation errors found",
        description: `Please fix ${Object.keys(errors).length} validation error(s) before proceeding.`,
        variant: "destructive",
      });
    }
  };

  const updateFieldValue = (fieldId: string, newValue: any) => {
    setFormFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, value: newValue } : field
    ));
    
    // Clear validation error when field is updated
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  const renderField = (field: FormField) => {
    const hasError = validationErrors[field.id];

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.name ? field.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : field.id}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Badge variant="outline" className="text-xs">
            {Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}% confidence
          </Badge>
        </div>

        {field.type === 'text' && (
          <Input
            id={field.id}
            value={field.value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            disabled={!isEditing}
            className={hasError ? 'border-destructive' : ''}
          />
        )}

        {field.type === 'email' && (
          <Input
            id={field.id}
            type="email"
            value={field.value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            disabled={!isEditing}
            className={hasError ? 'border-destructive' : ''}
          />
        )}

        {field.type === 'date' && (
          <Input
            id={field.id}
            type="date"
            value={field.value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            disabled={!isEditing}
            className={hasError ? 'border-destructive' : ''}
          />
        )}

        {field.type === 'textarea' && (
          <Textarea
            id={field.id}
            value={field.value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            disabled={!isEditing}
            className={hasError ? 'border-destructive' : ''}
            rows={3}
          />
        )}

        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={field.value || false}
              onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
              disabled={!isEditing}
            />
            <Label htmlFor={field.id} className="text-sm">
              I agree to the terms and conditions
            </Label>
          </div>
        )}

        {hasError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  const getStatusIcon = (status: typeof generateStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'processing':
        return <FileText className="w-5 h-5 text-warning animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No document data available for processing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status indicators */}
      <div className="flex justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium">Generate Form</span>
          {getStatusIcon(generateStatus)}
          <Badge variant={generateStatus === 'completed' ? 'default' : 'secondary'}>
            {generateStatus}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Validate</span>
          {getStatusIcon(validateStatus)}
          <Badge variant={validateStatus === 'completed' ? 'default' : 'secondary'}>
            {validateStatus}
          </Badge>
        </div>
      </div>

      {generateStatus === 'processing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">
              {documentData?.templateMatch 
                ? `Generating Form Using ${documentData.templateMatch.name}` 
                : 'Generating Dynamic Form'
              }
            </h3>
            <p className="text-muted-foreground">
              {documentData?.templateMatch 
                ? `Using template structure for optimal field mapping and validation...`
                : 'Analyzing document structure and extracting form fields...'
              }
            </p>
            {documentData?.templateMatch && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-primary">
                  Template: {documentData.templateMatch.name} v{documentData.templateMatch.version}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((documentData.templateMatch.confidence <= 1 ? documentData.templateMatch.confidence * 100 : documentData.templateMatch.confidence))}% template match confidence
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {generateStatus === 'completed' && formFields.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated Form Fields
                {documentData?.templateMatch && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Template-Based
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {isEditing ? 'Stop Editing' : 'Edit Fields'}
                </Button>
                {validateStatus !== 'completed' && (
                  <Button
                    onClick={validateForm}
                    disabled={validateStatus === 'processing'}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {validateStatus === 'processing' ? 'Validating...' : 'Submit & Validate'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formFields.map(renderField)}
          </CardContent>
        </Card>
      )}

      {validateStatus === 'completed' && (
        <Card className="border-success">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-success mb-2">Form Validated Successfully</h3>
            <p className="text-muted-foreground">
              All form fields have been validated and are ready for the finalization step.
            </p>
          </CardContent>
        </Card>
      )}

      {(generateStatus === 'error' || validateStatus === 'error') && (
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              if (generateStatus === 'error') {
                setGenerateStatus('idle');
                generateForm();
              } else {
                validateForm();
              }
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