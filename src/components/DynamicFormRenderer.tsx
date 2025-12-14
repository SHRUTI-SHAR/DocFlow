import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Send, FileText, Calendar, Hash, Mail, Phone, CheckSquare, Square, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TemplateField } from '@/types/template';

interface DynamicFormRendererProps {
  fields: TemplateField[];
  initialData?: Record<string, any>;
  formTitle: string;
  formDescription?: string;
  onSave?: (data: Record<string, any>, status: 'draft' | 'submitted') => Promise<void>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  readonly?: boolean;
  showProgress?: boolean;
}

export const DynamicFormRenderer = ({
  fields,
  initialData = {},
  formTitle,
  formDescription,
  onSave,
  onSubmit,
  onCancel,
  readonly = false,
  showProgress = true
}: DynamicFormRendererProps) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const calculateProgress = () => {
    const requiredFields = fields.filter(field => field.required);
    if (requiredFields.length === 0) return 100;
    
    const completedFields = requiredFields.filter(field => {
      const value = formData[field.id];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      const value = formData[field.id];
      
      if (field.required && (!value || value === '')) {
        newErrors[field.id] = `${field.label} is required`;
        return;
      }
      
      if (value && field.validation) {
        if (field.validation.minLength && value.length < field.validation.minLength) {
          newErrors[field.id] = `${field.label} must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.id] = `${field.label} must be no more than ${field.validation.maxLength} characters`;
        }
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
          newErrors[field.id] = `${field.label} format is invalid`;
        }
      }
      
      // Type-specific validation
      if (value && field.type === 'email' && !/\S+@\S+\.\S+/.test(value)) {
        newErrors[field.id] = 'Please enter a valid email address';
      }
      if (value && field.type === 'phone' && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, ''))) {
        newErrors[field.id] = 'Please enter a valid phone number';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(formData, 'draft');
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below before submitting",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else if (onSave) {
        await onSave(formData, 'submitted');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldIcon = (type: TemplateField['type']) => {
    const iconMap = {
      text: FileText,
      email: Mail,
      phone: Phone,
      date: Calendar,
      number: Hash,
      checkbox: CheckSquare,
      select: Square,
      submit: Send,
      cancel: XCircle
    };
    return iconMap[type] || FileText;
  };

  const renderField = (field: TemplateField) => {
    const FieldIcon = getFieldIcon(field.type);
    const value = formData[field.id] || '';
    const hasError = !!errors[field.id];

    const fieldProps = {
      id: field.id,
      disabled: readonly || isSubmitting,
      className: hasError ? 'border-destructive' : '',
    };

    const renderFieldInput = () => {
      switch (field.type) {
        case 'text':
          return (
            <Input
              {...fieldProps}
              type="text"
              value={value}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          );
        
        case 'email':
          return (
            <Input
              {...fieldProps}
              type="email"
              value={value}
              placeholder="Enter email address"
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          );
        
        case 'phone':
          return (
            <Input
              {...fieldProps}
              type="tel"
              value={value}
              placeholder="Enter phone number"
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          );
        
        case 'date':
          return (
            <Input
              {...fieldProps}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          );
        
        case 'number':
          return (
            <Input
              {...fieldProps}
              type="number"
              value={value}
              placeholder="Enter number"
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          );
        
        case 'checkbox':
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={value === true}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                disabled={readonly || isSubmitting}
              />
              <Label htmlFor={field.id} className="text-sm font-normal">
                {field.label}
              </Label>
            </div>
          );
        
        case 'select':
          return (
            <Select
              value={value}
              onValueChange={(selectedValue) => handleFieldChange(field.id, selectedValue)}
              disabled={readonly || isSubmitting}
            >
              <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'submit':
          return (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={readonly || isSubmitting}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {field.label}
            </Button>
          );

        case 'cancel':
          return (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  window.history.back();
                }
              }}
              disabled={readonly || isSubmitting}
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {field.label}
            </Button>
          );
        
        default:
          return (
            <Textarea
              {...fieldProps}
              value={value}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              rows={3}
            />
          );
      }
    };

    if (field.type === 'checkbox') {
      return (
        <div key={field.id} className="space-y-2">
          {renderFieldInput()}
          {hasError && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>{errors[field.id]}</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    // Handle button fields (submit, cancel) 
    if (field.type === 'submit' || field.type === 'cancel') {
      return (
        <div key={field.id} className="space-y-2">
          {renderFieldInput()}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="flex items-center gap-2">
          <FieldIcon className="h-4 w-4" />
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
          {field.suggested && (
            <Badge variant="secondary" className="text-xs">
              AI Suggested
            </Badge>
          )}
        </Label>
        {renderFieldInput()}
        {hasError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{errors[field.id]}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const progress = calculateProgress();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {formTitle}
            </CardTitle>
            {formDescription && (
              <CardDescription className="mt-2">
                {formDescription}
              </CardDescription>
            )}
          </div>
          {showProgress && !readonly && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {progress}% Complete
              </span>
              <Progress value={progress} className="w-20" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields
            .filter(field => field.type !== 'submit' && field.type !== 'cancel') // Filter out button fields
            .map(renderField)}
        </div>
        
        {!readonly && (onSave || onSubmit) && (
          <div className="flex gap-3 pt-6 border-t">
            {onSave && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
            )}
            <Button
              variant="hero"
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isSaving}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};