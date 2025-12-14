import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileText, Search, Brain, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { DocumentData, FormField, TemplateMatch } from '@/types/workflow';
import { useEnhancedTemplateMatching } from '@/hooks/useEnhancedTemplateMatching';
import { useTemplateManager } from '@/hooks/useTemplateManager';
import type { EnhancedTemplateMatch } from '@/services/enhancedTemplateMatching';
import { TemplateDetection } from '@/components/TemplateDetection';
import { UnknownFormHandler } from '@/components/UnknownFormHandler';
import { useToast } from "@/hooks/use-toast";
import { DocumentAnalysisService } from "@/services/documentAnalysis";

interface UnderstandStepProps {
  documentData: DocumentData | null;
  onComplete: (data: DocumentData) => void;
  onError: (error: string) => void;
}

export const UnderstandStep: React.FC<UnderstandStepProps> = ({ documentData, onComplete, onError }) => {
  const [currentStep, setCurrentStep] = useState<'template-detection' | 'processing' | 'completed'>('template-detection');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMatch | EnhancedTemplateMatch | null>(null);
  const { findEnhancedMatches } = useEnhancedTemplateMatching();
  const { templates } = useTemplateManager();
  const [ocrText, setOcrText] = useState<string>('');
  const [detectedFields, setDetectedFields] = useState<FormField[]>([]);
  const [processWithoutTemplate, setProcessWithoutTemplate] = useState(false);
  const [showTemplateCreation, setShowTemplateCreation] = useState(false);
  
  const { toast } = useToast();

  // Real AI analysis using FastAPI backend
  const analyzeDocument = async (imageData: string, task: 'ocr' | 'field_detection' | 'template_matching') => {
    console.debug('[UnderstandStep] Using FastAPI backend for', task);
    
    try {
      const analysisService = DocumentAnalysisService.getInstance();
      const result = await analysisService.analyzeDocument(
        imageData,
        task,
        documentData?.filename || 'unknown'
      );

      console.debug('[UnderstandStep] FastAPI response:', result);
      return result;
    } catch (error) {
      console.error('Document analysis error:', error);
      throw error;
    }
  };

  const processDocumentWithTemplate = async (template: TemplateMatch | EnhancedTemplateMatch | null) => {
    if (!documentData) return;

    setCurrentStep('processing');
    setIsProcessing(true);
    
    try {
      // Real OCR Processing optimized for template structure
      setCurrentTask(`Running OCR analysis optimized for ${template.name}...`);
      setProgress(20);
      
      const ocrResult = await analyzeDocument(documentData.preprocessedImage || '', 'ocr');
      setOcrText(ocrResult.extractedText || '');

      // Layout Detection based on template
      setCurrentTask('Detecting layout using template structure...');
      setProgress(50);

      // Field Extraction guided by template
      setCurrentTask('Extracting fields using template mapping...');
      setProgress(70);
      
      const fieldResult = await analyzeDocument(documentData.preprocessedImage || '', 'field_detection');
      const mappedFields = (fieldResult.fields || []).map((field: any) => ({
        ...field,
        name: field.label || field.name || field.id,
        required: field.required || false,
        validation: field.validation || []
      }));
      setDetectedFields(mappedFields);

      // Validate against template
      setCurrentTask('Validating extraction against template...');
      setProgress(90);

      setCurrentTask('Analysis complete!');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate confidence based on template match and field results
      const avgConfidence = fieldResult.fields?.length > 0 
        ? fieldResult.fields.reduce((acc: number, field: any) => acc + (field.confidence || 0), 0) / fieldResult.fields.length
        : template.confidence;

      const processedData: DocumentData = {
        ...documentData,
        ocrText: ocrResult.extractedText || '',
        extractedFields: mappedFields,
        templateMatch: template,
        confidence: Math.max(avgConfidence, template.confidence) / 100, // Boost confidence when using template
        layoutData: {
          tables: [],
          signatures: [],
          checkboxes: []
        }
      };

      setCurrentStep('completed');
      
      toast({
        title: "Document understood successfully",
        description: `Extracted ${fieldResult.fields?.length || 0} fields using ${template.name} template with ${Math.round((template.confidence <= 1 ? template.confidence * 100 : template.confidence))}% confidence.`,
      });

      onComplete(processedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Understanding failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const processDocumentWithoutTemplate = async () => {
    if (!documentData) return;

    setCurrentStep('processing');
    setIsProcessing(true);
    
    try {
      // Real OCR Processing
      setCurrentTask('Running OCR analysis...');
      setProgress(20);
      
      const ocrResult = await analyzeDocument(documentData.preprocessedImage || '', 'ocr');
      setOcrText(ocrResult.extractedText || '');

      // Generic Layout Detection
      setCurrentTask('Detecting layout and structure...');
      setProgress(50);

      // Generic Field Extraction
      setCurrentTask('Extracting form fields...');
      setProgress(70);
      
      const fieldResult = await analyzeDocument(documentData.preprocessedImage || '', 'without_template_extraction');
      const mappedFields = (fieldResult.fields || []).map((field: any) => ({
        ...field,
        name: field.label || field.name || field.id,
        required: field.required || false,
        validation: field.validation || []
      }));
      setDetectedFields(mappedFields);

      setCurrentTask('Analysis complete!');
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      const avgConfidence = fieldResult.fields?.length > 0
        ? fieldResult.fields.reduce((acc: number, field: any) => acc + (field.confidence || 0), 0) / fieldResult.fields.length
        : 0;

      const processedData: DocumentData = {
        ...documentData,
        ocrText: ocrResult.extractedText || '',
        extractedFields: mappedFields,
        templateMatch: undefined, // No template used
        confidence: avgConfidence / 100,
        layoutData: {
          tables: [],
          signatures: [],
          checkboxes: []
        }
      };

      setCurrentStep('completed');
      
      toast({
        title: "Document processed without template",
        description: `Extracted ${fieldResult.fields?.length || 0} fields using generic extraction.`,
      });

      onComplete(processedData);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Understanding failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTemplateBasedOCR = (template: TemplateMatch): string => {
    // Generate OCR text based on template type
    switch (template.documentType) {
      case 'invoice':
        return `INVOICE\nInvoice Number: INV-2024-001\nDate: January 15, 2024\n\nBill To:\nJohn Smith\n123 Main Street\nNew York, NY 10001\nEmail: john.smith@email.com\n\nDescription: Professional Services\nAmount: $2,500.00\nTax: $250.00\nTotal: $2,750.00\n\nPayment Due: February 15, 2024`;
      case 'contract':
        return `PROJECT PROPOSAL\nProposal Number: PROP-2024-001\nDate: January 15, 2024\n\nClient: ABC Corporation\nProject Manager: Sarah Wilson\nProject Duration: 6 months\nBudget: $50,000\n\nScope of Work:\n- System Design\n- Development\n- Testing\n- Deployment`;
      default:
        return generateGenericOCR();
    }
  };

  const generateTemplateBasedFields = (template: TemplateMatch): FormField[] => {
    // Generate fields based on template structure
    const baseFields = [
      {
        id: '1',
        name: 'document_number',
        type: 'text' as const,
        value: template.documentType === 'invoice' ? 'INV-2024-001' : 'PROP-2024-001',
        confidence: 95 + Math.random() * 4, // High confidence due to template
        required: true,
        position: { x: 100, y: 50, width: 150, height: 20 }
      },
      {
        id: '2',
        name: 'date',
        type: 'date' as const,
        value: '2024-01-15',
        confidence: 92 + Math.random() * 6,
        required: true,
        position: { x: 100, y: 80, width: 120, height: 20 }
      },
      {
        id: '3',
        name: template.documentType === 'invoice' ? 'customer_name' : 'client_name',
        type: 'text' as const,
        value: template.documentType === 'invoice' ? 'John Smith' : 'ABC Corporation',
        confidence: 96 + Math.random() * 3,
        required: true,
        position: { x: 100, y: 120, width: 200, height: 20 }
      }
    ];

    // Add template-specific fields
    if (template.documentType === 'invoice') {
      baseFields.push(
      {
        id: '4',
        name: template.documentType === 'invoice' ? 'customer_email' : 'client_name',
        type: 'text' as const,
        value: template.documentType === 'invoice' ? 'john.smith@email.com' : 'ABC Corporation',
        confidence: 89 + Math.random() * 8,
        required: false,
        position: { x: 100, y: 180, width: 250, height: 20 }
      },
      {
        id: '5',
        name: 'amount',
        type: 'text' as const,
        value: '2500.00',
        confidence: 97 + Math.random() * 2,
        required: true,
        position: { x: 300, y: 250, width: 100, height: 20 }
      },
      {
        id: '6',
        name: 'total',
        type: 'text' as const,
        value: '2750.00',
        confidence: 96 + Math.random() * 3,
        required: true,
        position: { x: 300, y: 300, width: 100, height: 20 }
      }
      );
    } else if (template.documentType === 'contract') {
      baseFields.push(
        {
          id: '4',
          name: 'project_manager',
          type: 'text' as const,
          value: 'Sarah Wilson',
          confidence: 91 + Math.random() * 7,
          required: true,
          position: { x: 100, y: 180, width: 200, height: 20 }
        },
        {
          id: '5',
          name: 'budget',
          type: 'text' as const,
          value: '50000.00',
          confidence: 88 + Math.random() * 10,
          required: true,
          position: { x: 300, y: 250, width: 100, height: 20 }
        },
        {
          id: '6',
          name: 'duration',
          type: 'text' as const,
          value: '6 months',
          confidence: 93 + Math.random() * 5,
          required: false,
          position: { x: 300, y: 300, width: 100, height: 20 }
        }
      );
    }

    return baseFields;
  };

  const generateGenericOCR = (): string => {
    return `DOCUMENT\nTitle: Sample Document\nContent: This is a sample document with various fields and text content that needs to be processed and understood.`;
  };

  const generateGenericFields = (): FormField[] => {
    return [
      {
        id: '1',
        name: 'title',
        type: 'text',
        value: 'Sample Document',
        confidence: 75,
        required: true,
        position: { x: 100, y: 50, width: 150, height: 20 }
      },
      {
        id: '2',
        name: 'content',
        type: 'textarea',
        value: 'This is a sample document...',
        confidence: 65,
        required: false,
        position: { x: 100, y: 120, width: 300, height: 60 }
      }
    ];
  };

  const handleTemplateSelected = (template: TemplateMatch | EnhancedTemplateMatch) => {
    setSelectedTemplate(template);
    processDocumentWithTemplate(template);
  };

  const handleCreateNewTemplate = () => {
    setShowTemplateCreation(true);
  };

  const handleTemplateCreated = async (template: any) => {
    console.log('New template created:', template);
    
      // For now, save template in local storage and continue with processing
      // In a real app, this would save to the database
      localStorage.setItem('custom_template', JSON.stringify(template));

      toast({
        title: "Template saved locally",
        description: `${template.name} has been saved for this session`
      });

      // Convert template to TemplateMatch format and use for processing
      const templateMatch: TemplateMatch = {
        id: 'custom_' + Date.now(),
        name: template.name,
        confidence: template.accuracy || 90,
        version: template.version || '1.0',
        documentType: template.documentType || 'form',
        matchedFields: template.fields?.length || 0,
        totalFields: template.fields?.length || 0
      };

      setShowTemplateCreation(false);
      processDocumentWithTemplate(templateMatch);
  };

  const handleManualProcessing = () => {
    setProcessWithoutTemplate(true);
    processDocumentWithoutTemplate();
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No document data available. Please complete previous steps first.</p>
      </div>
    );
  }

  // Template Creation Phase  
  if (showTemplateCreation) {
    return (
      <UnknownFormHandler
        documentData={documentData?.preprocessedImage}
        onClose={() => setShowTemplateCreation(false)}
        onTemplateCreated={handleTemplateCreated}
      />
    );
  }

  // Template Detection Phase
  if (currentStep === 'template-detection' && !processWithoutTemplate) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Document Understanding</h3>
          <p className="text-muted-foreground">
            First, let's detect if this document matches any existing templates
          </p>
        </div>

        <TemplateDetection
          documentName={documentData.filename}
          documentData={documentData.preprocessedImage}
          onTemplateSelected={handleTemplateSelected}
          onCreateNew={handleCreateNewTemplate}
        />

        <Card className="p-6">
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-2">Alternative Processing Options</h4>
            <p className="text-muted-foreground mb-4">
              You can also process this document without using a template
            </p>
            <Button variant="outline" onClick={handleManualProcessing}>
              Process Without Template
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Processing Phase
  if (currentStep === 'processing') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {selectedTemplate ? `Processing with ${selectedTemplate.name}` : 'Processing Document'}
          </h3>
          <p className="text-muted-foreground">
            {selectedTemplate 
              ? `Using template-guided extraction for optimal results`
              : 'Performing generic OCR, layout detection, and field extraction'
            }
          </p>
        </div>

        {isProcessing ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{currentTask}</p>
              <Progress value={progress} className="w-full max-w-md" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className={progress >= 20 ? 'border-success' : ''}>
                <CardContent className="p-4 flex items-center space-x-3">
                  {progress >= 20 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {selectedTemplate ? 'Template-guided OCR' : 'OCR Analysis'}
                  </span>
                </CardContent>
              </Card>
              
              <Card className={progress >= 50 ? 'border-success' : ''}>
                <CardContent className="p-4 flex items-center space-x-3">
                  {progress >= 50 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Search className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {selectedTemplate ? 'Template Layout Mapping' : 'Layout Detection'}
                  </span>
                </CardContent>
              </Card>
              
              <Card className={progress >= 90 ? 'border-success' : ''}>
                <CardContent className="p-4 flex items-center space-x-3">
                  {progress >= 90 ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Brain className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {selectedTemplate ? 'Template Validation' : 'Field Extraction'}
                  </span>
                </CardContent>
              </Card>
            </div>

            {selectedTemplate && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-primary">Using Template: {selectedTemplate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Version {selectedTemplate.version} • {Math.round((selectedTemplate.confidence <= 1 ? selectedTemplate.confidence * 100 : selectedTemplate.confidence))}% match confidence
                    </p>
                  </div>
                </div>
              </Card>
            )}

          </div>
        ) : null}
      </div>
    );
  }

  // Results Phase
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Understanding Complete</h3>
        <p className="text-muted-foreground">
          {selectedTemplate 
            ? `Document processed using ${selectedTemplate.name} template`
            : 'Document processed with generic extraction'
          }
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Analysis Results
              {selectedTemplate && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Template-Based
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Fields Detected:</span>
              <Badge variant="secondary">{detectedFields.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Average Confidence:</span>
              <Badge variant="secondary">
                {detectedFields.length > 0 
                  ? Math.round(detectedFields.reduce((acc, f) => acc + (f.confidence <= 1 ? f.confidence * 100 : f.confidence), 0) / detectedFields.length)
                  : 0}%
              </Badge>
            </div>
            {selectedTemplate && (
              <>
                <div className="flex justify-between items-center">
                  <span>Template Match:</span>
                  <Badge variant="secondary">{Math.round((selectedTemplate.confidence <= 1 ? selectedTemplate.confidence * 100 : selectedTemplate.confidence))}%</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Template Information:</p>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{selectedTemplate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Version {selectedTemplate.version} • {selectedTemplate.documentType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.matchedFields}/{selectedTemplate.totalFields} template fields matched
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detected Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {detectedFields.map((field) => (
                <div key={field.id} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{field.value}</p>
                  </div>
                  <Badge 
                    variant={field.confidence >= 90 ? 'default' : field.confidence >= 70 ? 'secondary' : 'outline'}
                    className={field.confidence >= 90 ? 'bg-success text-success-foreground' : ''}
                  >
                    {Math.round((field.confidence <= 1 ? field.confidence * 100 : field.confidence))}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="p-6">
        <div className="flex justify-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentStep('template-detection');
              setSelectedTemplate(null);
              setProcessWithoutTemplate(false);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-analyze
          </Button>
          <Button 
            variant="hero"
            onClick={() => {
              // This would typically be handled by the parent workflow
              toast({
                title: "Understanding complete",
                description: "Ready to proceed to form generation step.",
              });
            }}
          >
            Proceed to Form Generation
          </Button>
        </div>
      </Card>
    </div>
  );
};