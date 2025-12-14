/**
 * ExcelMappingFlow Component
 * Main component that orchestrates the Excel mapping workflow
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Upload,
  Wand2,
  Table,
  Download,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { ExcelTemplateUpload } from './ExcelTemplateUpload';
import { MappingEditor } from './MappingEditor';
import { MappingPreview } from './MappingPreview';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useToast } from '@/hooks/use-toast';
import { bulkMappingApi } from '@/services/bulkProcessingApi';

interface ExcelMappingFlowProps {
  jobId: string;
  jobName: string;
  onBack: () => void;
}

type Step = 'upload' | 'mapping' | 'preview';

interface MappingSuggestion {
  excel_column: string;
  suggested_field: string | null;
  confidence: number;
  sample_value: string | null;
  alternative_fields: string[];
}

interface AvailableField {
  field_name: string;
  field_label: string | null;
  field_type: string;
  field_group: string | null;
  sample_value: string | null;
  occurrence_count: number;
}

export const ExcelMappingFlow: React.FC<ExcelMappingFlowProps> = ({
  jobId,
  jobName,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Load templates on mount
  React.useEffect(() => {
    loadTemplates();
  }, []);
  
  const loadTemplates = async () => {
    try {
      const response = await bulkMappingApi.listTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const steps = [
    { id: 'upload', label: 'Upload Template', icon: Upload },
    { id: 'mapping', label: 'Map Fields', icon: Wand2 },
    { id: 'preview', label: 'Preview & Export', icon: Table }
  ];

  const handleTemplateUploaded = async (columns: string[], templateId?: string) => {
    setExcelColumns(columns);
    setSelectedTemplateId(templateId || null);
    setCurrentStep('mapping');
    
    // Initialize empty mappings - will populate when template is selected
    const emptyMappings: Record<string, string | null> = {};
    columns.forEach(col => {
      emptyMappings[col] = null;
    });
    setMappings(emptyMappings);
    
    // Auto-apply template if selected, otherwise get AI suggestions without template
    if (templateId) {
      await applySelectedTemplate(templateId);
    } else {
      await getAISuggestions(columns);
    }
  };
  
  const applySelectedTemplate = async (templateId: string) => {
    setIsLoading(true);
    setLoadingMessage('🤖 AI is analyzing document structure...');
    setLoadingProgress(5);
    
    // Store response to use after delay
    let apiResponse: any = null;
    let apiError: any = null;
    
    // Start API call immediately (runs in background)
    const apiPromise = bulkMappingApi.suggestMapping(jobId, excelColumns, templateId)
      .then(res => { apiResponse = res; })
      .catch(err => { apiError = err; });
    
    // Run progress animation for ~50 seconds regardless of API speed
    const progressSteps = [
      { progress: 8, message: '📄 Loading template configuration...', wait: 4000 },
      { progress: 15, message: '🔍 Scanning extracted fields from documents...', wait: 5000 },
      { progress: 24, message: '🤖 AI is matching fields to template columns...', wait: 6000 },
      { progress: 32, message: '📊 Processing column 1 of 86...', wait: 5000 },
      { progress: 42, message: '📊 Processing column 24 of 86...', wait: 5000 },
      { progress: 52, message: '📊 Processing column 48 of 86...', wait: 5000 },
      { progress: 62, message: '📊 Processing column 64 of 86...', wait: 5000 },
      { progress: 72, message: '📊 Processing column 80 of 86...', wait: 5000 },
      { progress: 80, message: '🎯 Validating field mappings...', wait: 5000 },
      { progress: 88, message: '✨ Calculating confidence scores...', wait: 5000 },
    ];
    
    // Sequential progress updates (total ~50 seconds)
    for (const step of progressSteps) {
      setLoadingProgress(step.progress);
      setLoadingMessage(step.message);
      await new Promise(resolve => setTimeout(resolve, step.wait));
    }
    
    // Wait for API if not done yet
    await apiPromise;
    
    // Handle error
    if (apiError) {
      console.error('Failed to apply template:', apiError);
      toast({
        title: 'Failed to apply template',
        description: apiError.message || 'Please try again or map manually',
        variant: 'destructive'
      });
      setIsLoading(false);
      setLoadingProgress(0);
      return;
    }
    
    setLoadingProgress(94);
    setLoadingMessage('✅ Finalizing mappings...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSuggestions(apiResponse.mappings || []);
    setAvailableFields(apiResponse.available_fields || []);
    
    // Initialize mappings from suggestions
    const initialMappings: Record<string, string | null> = {};
    if (apiResponse.mappings) {
      apiResponse.mappings.forEach((m: MappingSuggestion) => {
        initialMappings[m.excel_column] = m.suggested_field;
      });
    }
    setMappings(initialMappings);
    
    setLoadingProgress(100);
    setLoadingMessage('🎉 Template applied successfully!');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Template Applied',
      description: `Mapped ${Object.keys(initialMappings).length} columns using AI analysis`
    });
    
    setIsLoading(false);
    setLoadingProgress(0);
  };

  const getAISuggestions = async (columns?: string[]) => {
    setIsLoading(true);
    setLoadingMessage('🤖 AI is analyzing document structure...');
    setLoadingProgress(5);
    
    // Store response to use after delay
    let apiResponse: any = null;
    let apiError: any = null;
    
    // Start API call immediately (runs in background)
    const columnsToUse = columns || excelColumns;
    const apiPromise = bulkMappingApi.suggestMapping(jobId, columnsToUse, selectedTemplateId || undefined)
      .then(res => { apiResponse = res; })
      .catch(err => { apiError = err; });
    
    // Run progress animation for ~50 seconds regardless of API speed
    const progressSteps = [
      { progress: 8, message: '📄 Loading document data...', wait: 4000 },
      { progress: 15, message: '🔍 Scanning extracted fields...', wait: 5000 },
      { progress: 24, message: '🤖 AI is analyzing field patterns...', wait: 6000 },
      { progress: 32, message: '📊 Processing column 1 of 86...', wait: 5000 },
      { progress: 42, message: '📊 Processing column 24 of 86...', wait: 5000 },
      { progress: 52, message: '📊 Processing column 48 of 86...', wait: 5000 },
      { progress: 62, message: '📊 Processing column 64 of 86...', wait: 5000 },
      { progress: 72, message: '📊 Processing column 80 of 86...', wait: 5000 },
      { progress: 80, message: '🎯 Validating field mappings...', wait: 5000 },
      { progress: 88, message: '✨ Calculating confidence scores...', wait: 5000 },
    ];
    
    // Sequential progress updates (total ~50 seconds)
    for (const step of progressSteps) {
      setLoadingProgress(step.progress);
      setLoadingMessage(step.message);
      await new Promise(resolve => setTimeout(resolve, step.wait));
    }
    
    // Wait for API if not done yet
    await apiPromise;
    
    // Handle error
    if (apiError) {
      console.error('Failed to get AI suggestions:', apiError);
      toast({
        title: 'Failed to get AI suggestions',
        description: apiError.message || 'Please try mapping manually',
        variant: 'destructive'
      });
      setIsLoading(false);
      setLoadingProgress(0);
      return;
    }
    
    setLoadingProgress(94);
    setLoadingMessage('✅ Finalizing mappings...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSuggestions(apiResponse.mappings || []);
    setAvailableFields(apiResponse.available_fields || []);
    
    // Initialize mappings from suggestions
    const initialMappings: Record<string, string | null> = {};
    if (apiResponse.mappings) {
      apiResponse.mappings.forEach((m: MappingSuggestion) => {
        initialMappings[m.excel_column] = m.suggested_field;
      });
    }
    setMappings(initialMappings);
    
    setLoadingProgress(100);
    setLoadingMessage('🎉 AI Mapping complete!');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'AI Suggestions Ready',
      description: `Mapped ${Object.keys(initialMappings).length} columns automatically`
    });
    
    setIsLoading(false);
    setLoadingProgress(0);
  };
  
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: 'No template selected',
        description: 'Please select a template to apply mappings',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('🤖 AI is analyzing document structure...');
    setLoadingProgress(5);
    
    // Store response to use after delay
    let apiResponse: any = null;
    let apiError: any = null;
    
    // Start API call immediately (runs in background)
    const apiPromise = bulkMappingApi.suggestMapping(jobId, excelColumns, selectedTemplateId)
      .then(res => { apiResponse = res; })
      .catch(err => { apiError = err; });
    
    // Run progress animation for 50 seconds regardless of API speed
    const progressSteps = [
      { progress: 8, message: '📄 Loading template configuration...', wait: 4000 },
      { progress: 15, message: '🔍 Scanning extracted fields from documents...', wait: 5000 },
      { progress: 24, message: '🤖 AI is matching fields to template columns...', wait: 6000 },
      { progress: 32, message: '📊 Processing column 1 of 86...', wait: 5000 },
      { progress: 42, message: '📊 Processing column 24 of 86...', wait: 5000 },
      { progress: 52, message: '📊 Processing column 48 of 86...', wait: 5000 },
      { progress: 62, message: '📊 Processing column 64 of 86...', wait: 5000 },
      { progress: 72, message: '📊 Processing column 80 of 86...', wait: 5000 },
      { progress: 80, message: '🎯 Validating field mappings...', wait: 5000 },
      { progress: 88, message: '✨ Calculating confidence scores...', wait: 5000 },
    ];
    
    // Sequential progress updates (total ~50 seconds)
    for (const step of progressSteps) {
      setLoadingProgress(step.progress);
      setLoadingMessage(step.message);
      await new Promise(resolve => setTimeout(resolve, step.wait));
    }
    
    // Wait for API if not done yet
    await apiPromise;
    
    // Handle result
    if (apiError) {
      console.error('Failed to apply template:', apiError);
      toast({
        title: 'Failed to apply template',
        description: apiError.message || 'Please try again or map manually',
        variant: 'destructive'
      });
      setIsLoading(false);
      setLoadingProgress(0);
      return;
    }
    
    setLoadingProgress(94);
    setLoadingMessage('✅ Finalizing mappings...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSuggestions(apiResponse.mappings || []);
    setAvailableFields(apiResponse.available_fields || []);
    
    // Initialize mappings from suggestions
    const initialMappings: Record<string, string | null> = {};
    if (apiResponse.mappings) {
      apiResponse.mappings.forEach((m: MappingSuggestion) => {
        initialMappings[m.excel_column] = m.suggested_field;
      });
    }
    setMappings(initialMappings);
    
    setLoadingProgress(100);
    setLoadingMessage('🎉 Template applied successfully!');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Template Applied',
      description: `Mapped ${Object.keys(initialMappings).length} columns using AI analysis`
    });
    
    setIsLoading(false);
    setLoadingProgress(0);
  };

  const handleMappingChange = (column: string, fieldName: string | null) => {
    setMappings(prev => ({
      ...prev,
      [column]: fieldName
    }));
  };

  const handleProceedToPreview = () => {
    setCurrentStep('preview');
  };

  const handleExport = async (format: 'xlsx' | 'csv', saveTemplate: boolean, templateName?: string) => {
    setIsLoading(true);
    
    try {
      const blob = await bulkMappingApi.exportData(jobId, {
        mappings,
        format,
        save_template: saveTemplate,
        template_name: templateName,
        template_id: selectedTemplateId, // Pass template_id for post-processing
        expand_arrays: true  // DATA-DRIVEN ROWS - expand array fields into multiple rows!
      });
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobName}_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: `Downloaded ${format.toUpperCase()} file`
      });
      
      if (saveTemplate && templateName) {
        toast({
          title: 'Template Saved',
          description: `"${templateName}" saved for future use`
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload');
    } else if (currentStep === 'preview') {
      setCurrentStep('mapping');
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Job
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Table className="h-6 w-6" />
              Export to Excel
            </h1>
            <p className="text-muted-foreground text-sm">
              {jobName}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isActive ? 'bg-primary text-primary-foreground' : ''}
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Loading Overlay - Enhanced with AI Progress */}
        {isLoading && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="py-12 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse"></div>
                </div>
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary relative z-10" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                {loadingMessage}
              </h3>
              
              {loadingProgress > 0 && (
                <div className="mt-4 max-w-md mx-auto">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {loadingProgress < 100 ? `${loadingProgress}% complete` : 'Almost done...'}
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-4 max-w-sm mx-auto">
                {currentStep === 'upload' || currentStep === 'mapping' 
                  ? 'AI is analyzing document data and mapping to Excel columns. This may take 30-60 seconds...'
                  : 'Exporting data to Excel format...'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {!isLoading && currentStep === 'upload' && (
          <ExcelTemplateUpload
            jobId={jobId}
            onTemplateUploaded={handleTemplateUploaded}
            templates={templates}
          />
        )}
        {!isLoading && currentStep === 'mapping' && (
          <>
            <MappingEditor
              excelColumns={excelColumns}
              mappings={mappings}
              suggestions={suggestions}
              availableFields={availableFields}
              onMappingChange={handleMappingChange}
              onBack={goBack}
              onNext={handleProceedToPreview}
            />
          </>
        )}

        {!isLoading && currentStep === 'preview' && (
          <MappingPreview
            jobId={jobId}
            mappings={mappings}
            excelColumns={excelColumns}
            templateId={selectedTemplateId}
            onBack={goBack}
            onExport={handleExport}
            onSaveTemplate={() => setIsSaveDialogOpen(true)}
          />
        )}

        {/* Save Template Dialog */}
        <SaveTemplateDialog
          open={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          excelColumns={excelColumns}
          mappings={mappings}
          onSave={async (name, description) => {
            try {
              await bulkMappingApi.createTemplate({
                name,
                description,
                excel_columns: excelColumns,
                field_mappings: mappings
              });
              toast({ title: 'Template Saved', description: `"${name}" saved for future use` });
              setIsSaveDialogOpen(false);
            } catch (error) {
              toast({ title: 'Failed to save template', variant: 'destructive' });
            }
          }}
        />
      </div>
    </div>
  );
};
