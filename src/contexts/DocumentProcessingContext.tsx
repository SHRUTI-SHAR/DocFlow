import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TemplateMatch } from '@/types/document';
import { DocumentData, ProcessingSteps, WorkflowInstance } from '@/types/workflow';

type WorkflowStep = 'upload' | 'template-selection' | 'extraction' | 'completed';

interface DocumentProcessingContextType {
  // Document data state
  documentData: DocumentData | null;
  currentStep: number;
  processingSteps: ProcessingSteps;
  workflowInstance: WorkflowInstance | null;
  
  // Simple workflow step state
  currentWorkflowStep: WorkflowStep;
  setCurrentWorkflowStep: (step: WorkflowStep) => void;
  
  // Workflow document data (for SimplifiedDocumentWorkflow)
  workflowDocumentData: any;
  setWorkflowDocumentData: (data: any) => void;
  
  // Extracted data (final results)
  extractedData: any;
  setExtractedData: (data: any) => void;
  
  // Template preview state
  selectedTemplateForPreview: any;
  setSelectedTemplateForPreview: (template: any) => void;
  isTemplatePreviewOpen: boolean;
  setIsTemplatePreviewOpen: (isOpen: boolean) => void;
  
  // Template editor state
  selectedTemplateForEdit: any;
  setSelectedTemplateForEdit: (template: any) => void;
  isTemplateEditorOpen: boolean;
  setIsTemplateEditorOpen: (isOpen: boolean) => void;
  templateEditorData: any;
  setTemplateEditorData: (data: any) => void;
  
  // Form creation state
  isCreatingNewForm: boolean;
  setIsCreatingNewForm: (isCreating: boolean) => void;
  newFormData: any;
  setNewFormData: (data: any) => void;
  newFormFields: any[];
  setNewFormFields: (fields: any[]) => void;
  newFormSections: any[];
  setNewFormSections: (sections: any[]) => void;
  newFormHierarchicalData: any;
  setNewFormHierarchicalData: (data: any) => void;
  
  // Form preview state
  isFormPreviewOpen: boolean;
  setIsFormPreviewOpen: (isOpen: boolean) => void;
  formPreviewData: any;
  setFormPreviewData: (data: any) => void;
  isEditingData: boolean;
  setIsEditingData: (isEditing: boolean) => void;
  editedData: any;
  setEditedData: (data: any) => void;
  
  // Refresh trigger for document history
  refreshTrigger: number;
  triggerRefresh: () => void;
  
  // Template matching state
  templateMatches: TemplateMatch[];
  isTemplateMatching: boolean;
  templateMatchingProgress: number;
  
  // Actions for document processing
  setDocumentData: (data: DocumentData | null) => void;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  setProcessingSteps: (steps: ProcessingSteps) => void;
  setWorkflowInstance: (instance: WorkflowInstance | null) => void;
  updateStepStatus: (step: keyof ProcessingSteps, status: ProcessingSteps[keyof ProcessingSteps]) => void;
  moveToNextStep: () => void;
  
  // Actions for template matching
  setTemplateMatches: (matches: TemplateMatch[]) => void;
  setIsTemplateMatching: (isMatching: boolean) => void;
  setTemplateMatchingProgress: (progress: number) => void;
  resetTemplateMatching: () => void;
  
  // Reset all state
  resetAll: () => void;
}

const DocumentProcessingContext = createContext<DocumentProcessingContextType | undefined>(undefined);

export const useDocumentProcessingContext = () => {
  const context = useContext(DocumentProcessingContext);
  if (!context) {
    throw new Error('useDocumentProcessingContext must be used within a DocumentProcessingProvider');
  }
  return context;
};

interface DocumentProcessingProviderProps {
  children: ReactNode;
}

export const DocumentProcessingProvider: React.FC<DocumentProcessingProviderProps> = ({ children }) => {
  // Simplified document processing state
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingSteps>({
    capture: 'pending',
    understand: 'pending', 
    process: 'pending',
    finalize: 'pending',
  });
  const [workflowInstance, setWorkflowInstance] = useState<WorkflowInstance | null>(null);
  
  // Template matching state
  const [templateMatches, setTemplateMatches] = useState<TemplateMatch[]>([]);
  const [isTemplateMatching, setIsTemplateMatching] = useState(false);
  const [templateMatchingProgress, setTemplateMatchingProgress] = useState(0);

  // Simple workflow step state
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<WorkflowStep>('upload');

  // Workflow document data (for SimplifiedDocumentWorkflow)
  const [workflowDocumentData, setWorkflowDocumentData] = useState<any>(null);

  // Extracted data (final results)
  const [extractedData, setExtractedData] = useState<any>(null);

  // Template preview state
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<any>(null);
  const [isTemplatePreviewOpen, setIsTemplatePreviewOpen] = useState<boolean>(false);

  // Template editor state
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<any>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState<boolean>(false);
  const [templateEditorData, setTemplateEditorData] = useState<any>(null);

  // Template creation state
  const [isCreatingNewTemplate, setIsCreatingNewTemplate] = useState<boolean>(false);
  const [newTemplateData, setNewTemplateData] = useState<any>(null);
  const [newTemplateFields, setNewTemplateFields] = useState<any[]>([]);
  const [newTemplateSections, setNewTemplateSections] = useState<any[]>([]);
  const [newTemplateDocumentImage, setNewTemplateDocumentImage] = useState<string | undefined>(undefined);
  const [isEditingData, setIsEditingData] = useState<boolean>(false);
  const [editedData, setEditedData] = useState<any>({});
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Form creation state
  const [isCreatingNewForm, setIsCreatingNewForm] = useState<boolean>(false);
  const [newFormData, setNewFormData] = useState<any>(null);
  const [newFormFields, setNewFormFields] = useState<any[]>([]);
  const [newFormSections, setNewFormSections] = useState<any[]>([]);
  const [newFormHierarchicalData, setNewFormHierarchicalData] = useState<any>(null);
  
  // Form preview state
  const [isFormPreviewOpen, setIsFormPreviewOpen] = useState<boolean>(false);
  const [formPreviewData, setFormPreviewData] = useState<any>(null);

  // --- Persistence across tabs/routes using localStorage ---
  const STORAGE_KEY = 'docuform.documentProcessing';

  // Load persisted state on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (typeof state.currentStep === 'number') setCurrentStep(state.currentStep);
      if (state.processingSteps) setProcessingSteps(state.processingSteps);
      if (Array.isArray(state.templateMatches)) setTemplateMatches(state.templateMatches);
      if (typeof state.templateMatchingProgress === 'number') setTemplateMatchingProgress(state.templateMatchingProgress);
      if (typeof state.isTemplateMatching === 'boolean') setIsTemplateMatching(state.isTemplateMatching);
      // We avoid restoring the File/blob inside documentData; keep lightweight metadata if present
      if (state.documentData) {
        setDocumentData({
          id: state.documentData.id,
          filename: state.documentData.filename,
          preprocessedImage: state.documentData.preprocessedImage || null,
          originalFile: undefined as unknown as File, // placeholder, cannot persist File; set when user returns
          extractedFields: state.documentData.extractedFields || [],
          confidence: state.documentData.confidence || 0,
        } as unknown as DocumentData);
      }
    } catch (e) {
      console.warn('[DocumentProcessing] Failed to restore state:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist a lightweight snapshot when relevant state changes
  useEffect(() => {
    try {
      const snapshot = {
        documentData: documentData
          ? {
              id: documentData.id,
              filename: documentData.filename,
              preprocessedImage: (documentData as any).preprocessedImage || null,
              extractedFields: documentData.extractedFields || [],
              confidence: documentData.confidence || 0,
            }
          : null,
        currentStep,
        processingSteps,
        templateMatches,
        isTemplateMatching,
        templateMatchingProgress,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('[DocumentProcessing] Failed to persist state:', e);
    }
  }, [documentData, currentStep, processingSteps, templateMatches, isTemplateMatching, templateMatchingProgress]);

  // Document processing actions
  const updateStepStatus = (step: keyof ProcessingSteps, status: ProcessingSteps[keyof ProcessingSteps]) => {
    setProcessingSteps(prev => ({ ...prev, [step]: status }));
  };

  const moveToNextStep = () => {
    if (currentStep < 3) { // 0-3 steps (capture, understand, process, finalize)
      setCurrentStep(prev => prev + 1);
    }
  };

  const resetTemplateMatching = () => {
    setTemplateMatches([]);
    setIsTemplateMatching(false);
    setTemplateMatchingProgress(0);
  };

  const resetAll = () => {
    setDocumentData(null);
    setCurrentStep(0);
    setProcessingSteps({
      capture: 'pending',
      understand: 'pending',
      process: 'pending',
      finalize: 'pending',
    });
    setWorkflowInstance(null);
    resetTemplateMatching();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const value: DocumentProcessingContextType = {
    // Document processing state
    documentData,
    currentStep,
    processingSteps,
    workflowInstance,
    
    // Simple workflow step state
    currentWorkflowStep,
    setCurrentWorkflowStep,
    
    // Workflow document data
    workflowDocumentData,
    setWorkflowDocumentData,
    
    // Extracted data
    extractedData,
    setExtractedData,
    
    // Template preview state
    selectedTemplateForPreview,
    setSelectedTemplateForPreview,
    isTemplatePreviewOpen,
    setIsTemplatePreviewOpen,
    
    // Template editor state
    selectedTemplateForEdit,
    setSelectedTemplateForEdit,
    isTemplateEditorOpen,
    setIsTemplateEditorOpen,
    templateEditorData,
    setTemplateEditorData,
    
    // Template creation state
    isCreatingNewTemplate,
    setIsCreatingNewTemplate,
    newTemplateData,
    setNewTemplateData,
    newTemplateFields,
    setNewTemplateFields,
    newTemplateSections,
    setNewTemplateSections,
    newTemplateDocumentImage,
    setNewTemplateDocumentImage,
    isEditingData,
    setIsEditingData,
    editedData,
    setEditedData,
    refreshTrigger,
    triggerRefresh,
    
    // Form creation state
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
    
    // Form preview state
    isFormPreviewOpen,
    setIsFormPreviewOpen,
    formPreviewData,
    setFormPreviewData,
    
    // Template matching state
    templateMatches,
    isTemplateMatching,
    templateMatchingProgress,
    
    // Document processing actions
    setDocumentData,
    setCurrentStep,
    setProcessingSteps,
    setWorkflowInstance,
    updateStepStatus,
    moveToNextStep,
    
    // Template matching actions
    setTemplateMatches,
    setIsTemplateMatching,
    setTemplateMatchingProgress,
    resetTemplateMatching,
    
    // Reset all
    resetAll,
  };

  return (
    <DocumentProcessingContext.Provider value={value}>
      {children}
    </DocumentProcessingContext.Provider>
  );
};
