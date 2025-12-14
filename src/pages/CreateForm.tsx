import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTemplateManager, type Template } from '@/hooks/useTemplateManager';
import { HierarchicalFormDesigner } from '@/components/form-designer/HierarchicalFormDesigner';
import { FormPreview } from '@/components/form-designer/FormPreview';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { TemplateField } from '@/types/template';
import { useDocumentProcessingContext } from '@/contexts/DocumentProcessingContext';
import { FormCreationMethodSelector } from '@/components/form-designer/FormCreationMethodSelector';
import { PopularTemplatesSection } from '@/components/form-designer/PopularTemplatesSection';
import { FormSettingsCard } from '@/components/form-designer/FormSettingsCard';
import { useFormFileUpload } from '@/components/form-designer/useFormFileUpload';
import { useFormSave } from '@/components/form-designer/useFormSave';
import { useFormLoad } from '@/components/form-designer/useFormLoad';
import { useFormScroll } from '@/components/form-designer/useFormScroll';
import { FormStepHeader } from '@/components/form-designer/FormStepHeader';
import { formatFieldName } from '@/utils/templateUtils';

interface FormData {
  title: string;
  description: string;
  isPublic: boolean;
  template?: Template;
  fields: TemplateField[];
  hierarchicalData?: any;
  sections?: Array<{id: string, name: string, order: number}>;
}

export const CreateForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formId } = useParams<{ formId?: string }>();
  const { templates, fetchTemplates, fetchTemplateById, isLoading: templatesLoading } = useTemplateManager();
  const { isUploading, handleFileUpload: handleFileUploadHook } = useFormFileUpload();
  const isEditMode = !!formId;
  const [loading, setLoading] = useState(isEditMode);
  
  // Global state for form creation
  const {
    isCreatingNewForm,
    setIsCreatingNewForm,
    newFormData,
    setNewFormData,
    newFormFields,
    setNewFormFields,
    newFormSections,
    setNewFormSections,
    newFormHierarchicalData,
    setNewFormHierarchicalData,
    isFormPreviewOpen,
    setIsFormPreviewOpen,
    formPreviewData,
    setFormPreviewData,
  } = useDocumentProcessingContext();
  
  const [step, setStep] = useState<'method' | 'design' | 'preview'>('method');
  const [hierarchicalData, setHierarchicalData] = useState<any>(null);
  const [preservedOriginalHierarchicalData, setPreservedOriginalHierarchicalData] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    isPublic: false,
    fields: []
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use modular hooks
  const scrollContainerRef = useFormScroll({ isEditMode, formId, loading });
  
  // Memoize callbacks to prevent unnecessary re-renders
  const handleFormLoaded = useCallback(({ formData: loadedFormData, hierarchicalData: loadedHierarchicalData, preservedOriginalHierarchicalData: preserved }: {
    formData: FormData;
    hierarchicalData: any;
    preservedOriginalHierarchicalData: any;
  }) => {
    setFormData(loadedFormData);
    setHierarchicalData(loadedHierarchicalData);
    setPreservedOriginalHierarchicalData(preserved);
    setStep('design');
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setLoading(loading);
  }, []);
  
  useFormLoad({
    isEditMode,
    formId,
    user: user || null,
    onFormLoaded: handleFormLoaded,
    onLoadingChange: handleLoadingChange
  });

  const { saveForm } = useFormSave({
    isEditMode,
    formId,
    preservedOriginalHierarchicalData
  });

  // Sync local state with global state (only on initial load)
  useEffect(() => {
    if (isCreatingNewForm && newFormData && !formData.title) {
      setFormData(newFormData);
      if (newFormHierarchicalData) {
        setHierarchicalData(newFormHierarchicalData);
        // Preserve original hierarchical data from global state to maintain exact order
        // Deep clone to prevent accidental mutations
        const preservedData = typeof newFormHierarchicalData === 'object' && newFormHierarchicalData !== null
          ? JSON.parse(JSON.stringify(newFormHierarchicalData))
          : newFormHierarchicalData;
        setPreservedOriginalHierarchicalData(preservedData);
      }
      if (newFormFields.length > 0) {
        setFormData(prev => ({ ...prev, fields: newFormFields }));
      }
      if (newFormSections.length > 0) {
        setFormData(prev => ({ ...prev, sections: newFormSections }));
      }
    }
  }, [isCreatingNewForm]); // Remove the circular dependencies

  // Save form data to global state when it changes (debounced to prevent loops)
  useEffect(() => {
    if (step === 'design') {
      const timeoutId = setTimeout(() => {
        setNewFormData(formData);
        if (hierarchicalData) {
          setNewFormHierarchicalData(hierarchicalData);
        }
        if (formData.fields) {
          setNewFormFields(formData.fields);
        }
        if (formData.sections) {
          setNewFormSections(formData.sections);
        }
      }, 100); // Small delay to prevent rapid updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, hierarchicalData, step]); // Remove setter functions from dependencies

  // Persist latest designer state locally to survive tab minimize/reopen (edit mode)
  useEffect(() => {
    if (!isEditMode || !formId) return;
    const storageKey = `editForm_${formId}_draft`;
    const payload = {
      timestamp: Date.now(),
      formData,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }, [formData, isEditMode, formId]);

  // Handle preview form
  const handlePreviewForm = () => {
    // If available, prefer the most recent draft from localStorage (covers minimize/restore)
    let latestHierarchical = formData.hierarchicalData || hierarchicalData || {};
    if (isEditMode && formId) {
      try {
        const storageKey = `editForm_${formId}_draft`;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { timestamp: number; formData: typeof formData };
          // If draft has hierarchicalData and differs, use it
          if (parsed?.formData?.hierarchicalData && Object.keys(parsed.formData.hierarchicalData).length > 0) {
            latestHierarchical = parsed.formData.hierarchicalData;
          }
        }
      } catch {}
    }

    const previewData = {
      title: formData.title || 'Untitled Form',
      description: formData.description || '',
      fields: formData.fields || [],
      sections: formData.sections || [],
      // Use the freshest hierarchical data available (local draft fallback)
      hierarchicalData: latestHierarchical
    };
    setFormPreviewData(previewData);
    setIsFormPreviewOpen(true);
  };

  // Get template from URL params if provided
  const templateId = searchParams.get('template');
  
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user, fetchTemplates]);

  useEffect(() => {
    if (templateId) {
      // Fetch complete template data including template_structure
      const loadTemplate = async () => {
        try {
          const fullTemplate = await fetchTemplateById(templateId);
          if (fullTemplate) {
            // Check if template has hierarchical data
            const hasHierarchicalData = fullTemplate.metadata?.template_structure || fullTemplate.metadata?.hierarchical_data;
            
            // Always set hierarchicalData, even if empty, to ensure the designer receives the data
            if (hasHierarchicalData) {
              setHierarchicalData(hasHierarchicalData);
              // Preserve original hierarchical data from template to maintain exact order
              // Deep clone to prevent accidental mutations
              const preservedData = typeof hasHierarchicalData === 'object' && hasHierarchicalData !== null
                ? JSON.parse(JSON.stringify(hasHierarchicalData))
                : hasHierarchicalData;
              setPreservedOriginalHierarchicalData(preservedData);
            } else {
              // If no hierarchical data, set empty object to ensure designer initializes
              setHierarchicalData({});
              setPreservedOriginalHierarchicalData({});
            }
            
            // Extract sections from template - prioritize metadata.sections, then derive from fields
            let templateSections = fullTemplate.metadata?.sections || [];
            if (!templateSections || templateSections.length === 0) {
              // If no sections in metadata, extract from fields
              const sectionMap = new Map<string, {id: string, name: string, order: number}>();
              (fullTemplate.fields || []).forEach((field: any, index: number) => {
                const sectionId = field.section || 'general';
                if (!sectionMap.has(sectionId)) {
                    sectionMap.set(sectionId, {
                      id: sectionId,
                      name: sectionId === 'general' ? 'General' : formatFieldName(field.section || sectionId),
                      order: sectionMap.size
                    });
                }
              });
              templateSections = Array.from(sectionMap.values());
              
              // If still no sections and we have hierarchical data, extract from hierarchical data
              if (templateSections.length === 0 && hasHierarchicalData && typeof hasHierarchicalData === 'object') {
                Object.keys(hasHierarchicalData).forEach((key, index) => {
                  if (!key.startsWith('_')) {
                    templateSections.push({
                      id: key.toLowerCase(),
                      name: formatFieldName(key),
                      order: index
                    });
                  }
                });
              }
            }
            
            setFormData({
              title: `Form based on ${fullTemplate.name}`,
              description: fullTemplate.description || '',
              isPublic: false,
              template: fullTemplate,
              fields: fullTemplate.fields || [],
              hierarchicalData: hasHierarchicalData || {},
              sections: templateSections
            });
            setStep('design');
            
            // Track template usage
            trackTemplateUsage(fullTemplate.id, 'form_creation_start');
          }
        } catch (error) {
          console.error('Failed to load template:', error);
        }
      };
      
      loadTemplate();
    }
  }, [templateId, fetchTemplateById]);

  const trackTemplateUsage = async (templateId: string, action: string, success = true) => {
    try {
      const learningService = TemplateLearningService.getInstance();
      await learningService.logTemplateUsage(templateId, action, success, 1.0);
    } catch (error) {
      console.error('Failed to track template usage:', error);
    }
  };

  // Show loading spinner while loading form in edit mode
  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to create forms.
          </p>
          <Button variant="hero" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const result = await handleFileUploadHook(file);
    
    if (result) {
      // Set up form with detected fields
      setHierarchicalData(result.hierarchicalData);
      // Preserve original hierarchical data from LLM to maintain exact field order
      const preservedData = typeof result.hierarchicalData === 'object' && result.hierarchicalData !== null
        ? Object.fromEntries(Object.entries(result.hierarchicalData))
        : result.hierarchicalData;
      setPreservedOriginalHierarchicalData(preservedData);
      setFormData({
        title: result.title,
        description: result.description,
        isPublic: false,
        fields: result.fields,
        hierarchicalData: result.hierarchicalData,
        sections: result.sections
      });

      // Set global state for form creation
      setIsCreatingNewForm(true);
      setNewFormData({
        title: result.title,
        description: result.description,
        isPublic: false,
        fields: result.fields,
        hierarchicalData: result.hierarchicalData,
        sections: result.sections
      });
      setNewFormHierarchicalData(result.hierarchicalData);
      setNewFormFields(result.fields);
      setNewFormSections(result.sections);

      // Navigate to design step
      setStep('design');
    }
    
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleMethodSelect = (method: 'template' | 'upload' | 'scratch') => {
    if (method === 'template') {
      navigate('/templates?mode=select&returnTo=/forms/create');
    } else if (method === 'upload') {
      // Trigger file selection dialog
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // Start from scratch → open Hierarchical Form Designer by default
      setHierarchicalData({});
      setFormData({
        title: 'New Form',
        description: '',
        isPublic: false,
        fields: [],
        hierarchicalData: {},
        sections: [{ id: 'general', name: 'General', order: 0 }]
      });
      setStep('design');
      
      // Set global state for form creation
      setIsCreatingNewForm(true);
      setNewFormData({
        title: 'New Form',
        description: '',
        isPublic: false,
        fields: [],
        hierarchicalData: {},
        sections: [{ id: 'general', name: 'General', order: 0 }]
      });
      setNewFormHierarchicalData({});
      setNewFormFields([]);
      setNewFormSections([{ id: 'general', name: 'General', order: 0 }]);
    }
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      await saveForm(formData);
    } catch (_error) {
      // Error handling is done in the hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="min-h-dvh bg-background"
    >
      {/* Hidden file input for document upload - always available */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileUpload}
        className="hidden"
        disabled={isUploading}
      />

      {step === 'method' && !isEditMode && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <FormStepHeader
            step="method"
            isEditMode={false}
            onBack={() => navigate('/forms')}
          />

          {/* Creation Methods */}
          <FormCreationMethodSelector
            onMethodSelect={handleMethodSelect}
            templatesCount={templates.length}
            templatesLoading={templatesLoading}
            isUploading={isUploading}
          />

          {/* Popular Templates Preview */}
          <PopularTemplatesSection
            templates={templates}
            isLoading={templatesLoading}
            onTemplateSelect={async (template) => {
              // Fetch complete template data including template_structure
              try {
                const fullTemplate = await fetchTemplateById(template.id);
                if (fullTemplate) {
                  // Check if template has hierarchical data
                  const hasHierarchicalData = fullTemplate.metadata?.template_structure || fullTemplate.metadata?.hierarchical_data;
                  
                  // Always set hierarchicalData, even if empty, to ensure the designer receives the data
                  if (hasHierarchicalData) {
                    setHierarchicalData(hasHierarchicalData);
                    // Preserve original hierarchical data from template to maintain exact order
                    // Deep clone to prevent accidental mutations
                    const preservedData = typeof hasHierarchicalData === 'object' && hasHierarchicalData !== null
                      ? JSON.parse(JSON.stringify(hasHierarchicalData))
                      : hasHierarchicalData;
                    setPreservedOriginalHierarchicalData(preservedData);
                  } else {
                    // If no hierarchical data, set empty object to ensure designer initializes
                    setHierarchicalData({});
                    setPreservedOriginalHierarchicalData({});
                  }
                  
                  // Extract sections from template - prioritize metadata.sections, then derive from fields
                  let templateSections = fullTemplate.metadata?.sections || [];
                  if (!templateSections || templateSections.length === 0) {
                    // If no sections in metadata, extract from fields
                    const sectionMap = new Map<string, {id: string, name: string, order: number}>();
                    (fullTemplate.fields || []).forEach((field: any, index: number) => {
                      const sectionId = field.section || 'general';
                      if (!sectionMap.has(sectionId)) {
                    sectionMap.set(sectionId, {
                      id: sectionId,
                      name: sectionId === 'general' ? 'General' : formatFieldName(field.section || sectionId),
                      order: sectionMap.size
                    });
                      }
                    });
                    templateSections = Array.from(sectionMap.values());
                    
                    // If still no sections and we have hierarchical data, extract from hierarchical data
                    if (templateSections.length === 0 && hasHierarchicalData && typeof hasHierarchicalData === 'object') {
                      Object.keys(hasHierarchicalData).forEach((key, index) => {
                        if (!key.startsWith('_')) {
                          templateSections.push({
                            id: key.toLowerCase(),
                            name: formatFieldName(key),
                            order: index
                          });
                        }
                      });
                    }
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    title: `Form based on ${fullTemplate.name}`,
                    description: fullTemplate.description || '',
                    isPublic: false,
                    template: fullTemplate,
                    fields: fullTemplate.fields || [],
                    hierarchicalData: hasHierarchicalData || {},
                    sections: templateSections
                  }));
                  setStep('design');
                }
              } catch (error) {
                console.error('Failed to load template:', error);
              }
            }}
          />
        </div>
      )}

      {step === 'design' && (
        <div className={`max-w-7xl mx-auto px-6 py-8 ${isEditMode ? 'pb-20' : ''}`}>
          <FormStepHeader
            step="design"
            isEditMode={isEditMode}
            templateName={formData.template?.name}
            onBack={() => isEditMode ? navigate('/forms') : setStep('method')}
            onPreview={handlePreviewForm}
            onSave={handleSaveForm}
            saving={saving}
          />

          {/* Form Settings Card (only in edit mode) */}
          {isEditMode && (
            <FormSettingsCard
              title={formData.title}
              description={formData.description}
              onTitleChange={(title) => setFormData(prev => ({ ...prev, title }))}
              onDescriptionChange={(description) => setFormData(prev => ({ ...prev, description }))}
            />
          )}

          {/* Form Designer */}
          <div>
            <HierarchicalFormDesigner
              key={formData.template?.id || formId || 'new-form'}
              initialData={hierarchicalData}
              initialFields={formData.fields}
              initialSections={formData.sections}
              onDataChange={(data) => {
                setFormData(prev => ({
                  ...prev,
                  hierarchicalData: preservedOriginalHierarchicalData || data.hierarchicalData,
                  sections: data.sections,
                  fields: data.fields
                }));
              }}
              onSave={(data) => {
                setFormData(prev => ({
                  ...prev,
                  hierarchicalData: preservedOriginalHierarchicalData || data.hierarchicalData,
                  sections: data.sections,
                  fields: data.fields
                }));
                setStep('preview');
              }}
              formTitle={formData.title}
              formDescription={formData.description}
              onTitleChange={(title) => setFormData(prev => ({ ...prev, title }))}
              onDescriptionChange={(description) => setFormData(prev => ({ ...prev, description }))}
              formId={formId}
              hideFormSettings={isEditMode}
            />
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <FormStepHeader
            step="preview"
            isEditMode={isEditMode}
            onBack={() => setStep('design')}
            onSave={handleSaveForm}
            saving={saving}
          />

          {/* Form Preview */}
          <FormPreview
            isOpen={true}
            onClose={() => setStep('design')}
            formData={{
              title: formData.title || 'Untitled Form',
              description: formData.description || '',
              fields: formData.fields || [],
              sections: formData.sections || [],
              // Use latest hierarchical data from formData
              hierarchicalData: formData.hierarchicalData || {}
            }}
          />
        </div>
      )}
      
      {/* Form Preview Modal */}
      {isFormPreviewOpen && step !== 'preview' && (
        <FormPreview
          isOpen={isFormPreviewOpen}
          onClose={() => setIsFormPreviewOpen(false)}
          formData={formPreviewData}
        />
      )}
    </div>
  );
};