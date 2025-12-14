import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { DocumentData, FormField } from '@/types/workflow';

interface ValidateStepProps {
  documentData: DocumentData | null;
  onComplete: (data: DocumentData) => void;
  onError: (error: string) => void;
}

export const ValidateStep: React.FC<ValidateStepProps> = ({ documentData, onComplete, onError }) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (!documentData?.extractedFields) return {};
    return documentData.extractedFields.reduce((acc, field) => ({
      ...acc,
      [field.name]: field.value
    }), {});
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === '')) {
      return 'This field is required';
    }

    if (field.validation) {
      for (const rule of field.validation) {
        switch (rule.type) {
          case 'email':
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return rule.message;
            }
            break;
          case 'minLength':
            if (value && value.length < rule.value) {
              return rule.message;
            }
            break;
          case 'maxLength':
            if (value && value.length > rule.value) {
              return rule.message;
            }
            break;
          case 'pattern':
            if (value && !new RegExp(rule.value).test(value)) {
              return rule.message;
            }
            break;
        }
      }
    }

    return null;
  };

  const validateAllFields = () => {
    if (!documentData?.extractedFields) return true;
    
    const errors: Record<string, string> = {};
    
    for (const field of documentData.extractedFields) {
      const error = validateField(field, formData[field.name]);
      if (error) {
        errors[field.name] = error;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    setIsValidating(true);
    
    try {
      // Validate all fields
      const isValid = validateAllFields();
      
      if (!isValid) {
        throw new Error('Please fix validation errors before continuing');
      }
      
      // Simulate cross-field validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!documentData) return;
      
      // Update document data with validated values
      const updatedFields = documentData.extractedFields.map(field => ({
        ...field,
        value: formData[field.name] || field.value
      }));
      
      const updatedData: DocumentData = {
        ...documentData,
        extractedFields: updatedFields
      };

      onComplete(updatedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const hasError = validationErrors[field.name];
    const value = formData[field.name] || '';

    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            {field.name ? field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : field.id}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <Badge 
              variant={field.confidence >= 90 ? 'default' : field.confidence >= 70 ? 'secondary' : 'outline'}
              className={field.confidence >= 90 ? 'bg-success text-success-foreground' : ''}
            >
              {Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}%
            </Badge>
          </div>
        </div>
        
        {field.type === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            className={hasError ? 'border-destructive' : ''}
          />
        ) : field.type === 'select' ? (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.name, val)}
          >
            <SelectTrigger className={hasError ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <Label>Yes</Label>
          </div>
        ) : (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter ${field.name}`}
            className={hasError ? 'border-destructive' : ''}
          />
        )}
        
        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{hasError}</AlertDescription>
          </Alert>
        )}
        
        {field.validation?.map((rule, index) => (
          <p key={index} className="text-xs text-muted-foreground">
            • {rule.message}
          </p>
        ))}
      </div>
    );
  };

  if (!documentData?.extractedFields) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No extracted fields available. Please complete previous steps first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review & Validate Data</h3>
        <p className="text-muted-foreground">
          Review the extracted data and make any necessary corrections
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Form Data</CardTitle>
              <p className="text-sm text-muted-foreground">
                {documentData.extractedFields.length} fields extracted with average confidence of{' '}
                {Math.round(documentData.extractedFields.reduce((acc, f) => acc + (f.confidence <= 1 ? f.confidence * 100 : f.confidence), 0) / documentData.extractedFields.length)}%
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {documentData.extractedFields.map(renderFormField)}
            </CardContent>
          </Card>
        </div>

        {/* Validation Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Validation Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Fields:</span>
                  <Badge variant="secondary">{documentData.extractedFields.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Required Fields:</span>
                  <Badge variant="secondary">
                    {documentData.extractedFields.filter(f => f.required).length}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Validation Errors:</span>
                  <Badge variant={Object.keys(validationErrors).length > 0 ? 'destructive' : 'default'}>
                    {Object.keys(validationErrors).length}
                  </Badge>
                </div>
              </div>

              {Object.keys(validationErrors).length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All fields are valid and ready for submission.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {Object.keys(validationErrors).length} field(s) need attention before proceeding.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={validateAllFields}
                variant="outline" 
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-validate All
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Confidence Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documentData.extractedFields
                  .filter(f => f.confidence < 80)
                  .map(field => (
                    <div key={field.id} className="flex justify-between text-sm">
                      <span className="truncate">{field.name}</span>
                      <Badge variant="outline">{Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}%</Badge>
                    </div>
                  ))}
                {documentData.extractedFields.filter(f => f.confidence < 80).length === 0 && (
                  <p className="text-sm text-muted-foreground">All fields have high confidence scores</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          size="lg"
          disabled={isValidating || Object.keys(validationErrors).length > 0}
        >
          {isValidating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Submit & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
};