import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Eye, Code, Download } from 'lucide-react';
import { DocumentData, FormField, ValidationRule } from '@/types/workflow';

interface GenerateFormStepProps {
  documentData: DocumentData | null;
  onComplete: (data: DocumentData) => void;
  onError: (error: string) => void;
}

export const GenerateFormStep: React.FC<GenerateFormStepProps> = ({ documentData, onComplete, onError }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>(documentData?.extractedFields || []);
  const [previewMode, setPreviewMode] = useState<'form' | 'json'>('form');

  const handleFieldUpdate = (index: number, field: Partial<FormField>) => {
    setFormFields(prev => prev.map((f, i) => i === index ? { ...f, ...field } : f));
  };

  const addValidationRule = (fieldIndex: number, rule: ValidationRule) => {
    setFormFields(prev => prev.map((f, i) => 
      i === fieldIndex 
        ? { ...f, validation: [...(f.validation || []), rule] }
        : f
    ));
  };

  const removeValidationRule = (fieldIndex: number, ruleIndex: number) => {
    setFormFields(prev => prev.map((f, i) => 
      i === fieldIndex 
        ? { ...f, validation: f.validation?.filter((_, ri) => ri !== ruleIndex) }
        : f
    ));
  };

  const addNewField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      name: `field_${formFields.length + 1}`,
      type: 'text',
      value: '',
      confidence: 100,
      required: false,
      validation: []
    };
    setFormFields(prev => [...prev, newField]);
  };

  const removeField = (index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  };

  const generateForm = async () => {
    setIsGenerating(true);
    try {
      // Simulate form generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!documentData) return;
      
      const updatedData: DocumentData = {
        ...documentData,
        extractedFields: formFields
      };

      onComplete(updatedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Form generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormPreview = () => (
    <div className="space-y-4">
      {formFields.map((field, index) => (
        <div key={field.id} className="space-y-2">
          <Label className="flex items-center gap-2">
            {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            {field.required && <span className="text-destructive">*</span>}
            <Badge variant="outline" className="text-xs">
              {field.confidence}%
            </Badge>
          </Label>
          {field.type === 'select' ? (
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          ) : field.type === 'textarea' ? (
            <textarea 
              className="w-full p-2 border rounded-md" 
              rows={3}
              defaultValue={field.value}
            />
          ) : (
            <Input 
              type={field.type}
              defaultValue={field.value}
              placeholder={`Enter ${field.name}`}
            />
          )}
          {field.validation?.map((rule, ruleIndex) => (
            <p key={ruleIndex} className="text-xs text-muted-foreground">
              • {rule.message}
            </p>
          ))}
        </div>
      ))}
    </div>
  );

  const renderJsonSchema = () => {
    const schema = {
      type: "object",
      properties: formFields.reduce((acc, field) => ({
        ...acc,
        [field.name]: {
          type: field.type === 'number' ? 'number' : 'string',
          title: field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          default: field.value,
          ...(field.required && { required: true }),
          ...(field.validation?.length && { 
            validation: field.validation.map(v => ({ type: v.type, message: v.message }))
          })
        }
      }), {}),
      required: formFields.filter(f => f.required).map(f => f.name)
    };

    return (
      <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
        {JSON.stringify(schema, null, 2)}
      </pre>
    );
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No document data available. Please complete previous steps first.</p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating dynamic form...</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Creating field mappings</p>
          <p>• Setting up validations</p>
          <p>• Building React components</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Generate Dynamic Web Form</h3>
        <p className="text-muted-foreground">
          Configure fields, validations, and generate your web form
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Form Fields
              <Button onClick={addNewField} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {formFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Field {index + 1}</h4>
                  <Button
                    onClick={() => removeField(index)}
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Name</Label>
                    <Input
                      value={field.name}
                      onChange={(e) => handleFieldUpdate(index, { name: e.target.value })}
                      placeholder="field_name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => handleFieldUpdate(index, { type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Default Value</Label>
                  <Input
                    value={field.value}
                    onChange={(e) => handleFieldUpdate(index, { value: e.target.value })}
                    placeholder="Default value"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => handleFieldUpdate(index, { required: checked })}
                    />
                    <Label className="text-sm">Required</Label>
                  </div>
                  <Badge variant="outline">
                    {field.confidence}% confidence
                  </Badge>
                </div>

                {/* Validation Rules */}
                {field.validation?.map((rule, ruleIndex) => (
                  <div key={ruleIndex} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                    <span>{rule.type}: {rule.message}</span>
                    <Button
                      onClick={() => removeValidationRule(index, ruleIndex)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Preview
              <div className="flex gap-2">
                <Button
                  onClick={() => setPreviewMode('form')}
                  size="sm"
                  variant={previewMode === 'form' ? 'default' : 'outline'}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Form
                </Button>
                <Button
                  onClick={() => setPreviewMode('json')}
                  size="sm"
                  variant={previewMode === 'json' ? 'default' : 'outline'}
                >
                  <Code className="w-4 h-4 mr-1" />
                  Schema
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {previewMode === 'form' ? renderFormPreview() : renderJsonSchema()}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button onClick={generateForm} size="lg">
          <Download className="w-4 h-4 mr-2" />
          Generate Form
        </Button>
      </div>
    </div>
  );
};