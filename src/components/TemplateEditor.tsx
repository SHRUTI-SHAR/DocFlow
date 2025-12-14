import React, { useState, useEffect, useRef } from "react";
import { useDocumentProcessingContext } from "@/contexts/DocumentProcessingContext";
import { 
  Square,
  Type,
  Calendar,
  Hash,
  CheckSquare,
  Mail,
  Phone,
  FileText,
  Image,
  Signature,
  Table,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Template } from "@/hooks/useTemplateManager";
import { DocumentTemplateCanvas } from "./DocumentTemplateCanvas";
import type { TemplateField } from "@/types/template";
// Import modular hooks and utilities
import { useTemplateFields } from "./template-editor/hooks/useTemplateFields";
import { useTemplateSections } from "./template-editor/hooks/useTemplateSections";
import { useTemplateSave } from "./template-editor/hooks/useTemplateSave";
import { useTemplateExtraction } from "./template-editor/hooks/useTemplateExtraction";
import { formatFieldName, arraysEqual, objectsEqual, removePageSuffixesFromKeys } from "./template-editor/utils/templateHelpers";
import { convertHierarchicalToFields, convertFieldsToHierarchical, convertSectionsToHierarchical } from "./template-editor/utils/templateDataConverters";
import {
  TemplateEditorHeader,
  FieldPropertiesPanel,
  FieldPropertiesDialog,
  FieldList,
  ExtractionDialog,
  SaveTemplateDialog,
  SectionDialog,
} from "./template-editor/components";

interface TemplateEditorProps {
  template: Template;
  onClose: () => void;
  onSave?: (templateData: any) => void;
  isNew?: boolean;
  documentData?: string; // Add document data prop
}

export const TemplateEditor = ({ template, onClose, onSave, documentData }: TemplateEditorProps) => {
  const { toast } = useToast();
  const { 
    isCreatingNewTemplate,
    setIsCreatingNewTemplate,
    newTemplateData,
    setNewTemplateData,
    newTemplateFields,
    setNewTemplateFields,
    newTemplateSections,
    setNewTemplateSections,
    newTemplateDocumentImage,
    setNewTemplateDocumentImage
  } = useDocumentProcessingContext();
  
  // Use modular hooks for field and section management
  const {
    fields,
    selectedField,
    selectedFields,
    setFields,
    setSelectedField,
    setSelectedFields,
    handleFieldUpdate,
    addNewField: addNewFieldFromHook,
    addTableField,
    deleteField,
    duplicateField,
    alignFields,
    distributeFields,
    autoArrangeFields,
    toggleFieldSelection,
    selectAllFields,
    clearSelection
  } = useTemplateFields([], null);

  const {
    sections,
    selectedSection,
    showSectionDialog,
    newSectionName,
    editingSection,
    editingSectionName,
    setSections,
    setSelectedSection,
    setShowSectionDialog,
    setNewSectionName,
    setEditingSection,
    setEditingSectionName,
    addNewSection,
    startEditingSection,
    saveSectionEdit: saveSectionEditFromHook,
    cancelSectionEdit
  } = useTemplateSections([{ id: 'general', name: 'General', order: 0 }], 'general');

  const {
    isExtracting,
    extractionText,
    showExtraction,
    setIsExtracting,
    setExtractionText,
    setShowExtraction,
    extractFields
  } = useTemplateExtraction();

  // Local state for UI features and metadata
  const [documentImage, setDocumentImage] = useState<string | undefined>(documentData);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFieldPropertiesDialog, setShowFieldPropertiesDialog] = useState(false);
  // Store hierarchical data from LLM directly to preserve exact field order
  const [preservedHierarchicalData, setPreservedHierarchicalData] = useState<any>(null);
  const [templateMetadata, setTemplateMetadata] = useState({
    name: template.name || '',
    description: template.description || '',
    document_type: template.document_type || 'General',
    version: template.version || '1.0',
    status: template.status || 'draft' as 'draft' | 'active' | 'archived',
    is_public: template.is_public || false
  });
  
  // Use the save hook (after all state is initialized)
  const { saveTemplate } = useTemplateSave({
    template,
    fields,
    sections,
    templateMetadata,
    documentImage,
    preservedHierarchicalData,
    onSave
  });
  
  // Refs to prevent infinite loops when loading from global state
  const isLoadingFromGlobalRef = useRef(false);
  const isSavingToGlobalRef = useRef(false);
  
  // Scroll position persistence key
  const scrollPositionKey = `templateEditor_scroll_${template.id}`;
  
  // Restore scroll position when component mounts
  useEffect(() => {
    const restoreScroll = () => {
      const savedScroll = localStorage.getItem(scrollPositionKey);
      if (savedScroll) {
        try {
          const scrollPosition = parseInt(savedScroll, 10);
          window.scrollTo(0, scrollPosition);
        } catch (e) {
          console.error('Failed to restore scroll position:', e);
        }
      }
    };

    // Try multiple times to ensure content is loaded
    setTimeout(restoreScroll, 100);
    setTimeout(restoreScroll, 300);
    setTimeout(restoreScroll, 500);
  }, [scrollPositionKey]);

  // Save scroll position before unmount
  useEffect(() => {
    return () => {
      const scrollPosition = window.scrollY;
      localStorage.setItem(scrollPositionKey, scrollPosition.toString());
    };
  }, [scrollPositionKey]);
  
  // Restore overflow when dialogs close
  useEffect(() => {
    if (!showSaveDialog && !showSectionDialog && !showExtraction) {
      // All dialogs are closed, ensure overflow is restored immediately
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
    }
  }, [showSaveDialog, showSectionDialog, showExtraction]);
  
  // Keep document image in sync if the prop changes
  useEffect(() => {
    if (documentData) setDocumentImage(documentData);
  }, [documentData]);

  
  // Load template fields when component mounts or template changes
  useEffect(() => {
    // Prioritize hierarchical structure over fields array
    const hierarchicalStructure = template?.metadata?.template_structure || template?.metadata?.hierarchical_data;
    
    // DON'T preserve hierarchical data when loading existing template
    // Only preserve from fresh LLM extraction - this ensures manual edits regenerate metadata
    // setPreservedHierarchicalData is only set during fresh LLM extraction (see testExtraction)
    
    if (hierarchicalStructure && typeof hierarchicalStructure === 'object') {
      // Convert hierarchical structure to fields for editor
      const editorFields = convertHierarchicalToFields(hierarchicalStructure);
      setFields(editorFields);
      
      // Create sections from hierarchical structure
      // Get key order from metadata to preserve section sequence
      const keyOrder = (hierarchicalStructure as any)?._keyOrder;
      const sectionMap = new Map();
      let orderIndex = 0;
      
      // First, process keys in _keyOrder if available
      if (Array.isArray(keyOrder) && keyOrder.length > 0) {
        keyOrder.forEach((key: string) => {
          if (!(key in hierarchicalStructure) || key.startsWith('_')) return;
          
          const sectionName = formatFieldName(key);
          const sectionId = key.toLowerCase();
          if (!sectionMap.has(sectionId)) {
            sectionMap.set(sectionId, {
              id: sectionId,
              name: sectionName,
              order: orderIndex++
            });
          }
        });
      }
      
      // Then, process remaining keys not in _keyOrder
      Object.entries(hierarchicalStructure).forEach(([key, value]) => {
        // Skip internal metadata keys
        if (key.startsWith('_')) return;
        
        const sectionName = formatFieldName(key);
        const sectionId = key.toLowerCase();
        
        // Only add if not already in map (from _keyOrder processing above)
        if (!sectionMap.has(sectionId)) {
          sectionMap.set(sectionId, {
            id: sectionId,
            name: sectionName,
            order: orderIndex++
          });
        }
      });
      
      // Sort sections by order (preserves LLM order from _keyOrder)
      setSections(Array.from(sectionMap.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
    } else if (template?.fields && Array.isArray(template.fields)) {
      // Convert template fields to editor format
      const editorFields = template.fields.map((field: any) => ({
        id: field.id || `field-${Math.random().toString(36).substr(2, 9)}`,
        type: field.type || 'text',
        label: field.label || field.name || `Field ${field.id}`,
        required: field.required ?? false,
        confidence: field.confidence,
        options: field.options,
        validation: field.validation,
        value: field.value,
        suggested: field.suggested,
        section: field.section || 'general', // Preserve section information
        columns: field.columns || [], // Preserve table columns
        // Preserve grouped table properties
        isGroupedTable: field.isGroupedTable,
        groupedHeaders: field.groupedHeaders
      }));
      setFields(editorFields);
      
      // Load sections from template metadata if available
      if (template.metadata?.sections && Array.isArray(template.metadata.sections)) {
        setSections(template.metadata.sections);
      } else {
        // For existing templates without saved sections, extract sections from fields
        // Removed verbose logging
        
        // Extract unique sections from fields
        const sectionMap = new Map();
        editorFields.forEach(field => {
          const sectionId = field.section || 'general';
          const sectionName = formatFieldName(sectionId); // Strip page suffixes
          
          if (!sectionMap.has(sectionId)) {
            sectionMap.set(sectionId, {
              id: sectionId,
              name: sectionName,
              order: sectionMap.size
            });
          }
        });
        
        // If we have hierarchical_data, use it to create proper sections
        if (template.metadata?.hierarchical_data && typeof template.metadata.hierarchical_data === 'object') {
          console.log('🔍 Also loading sections from hierarchical_data in template metadata');
          
          Object.entries(template.metadata.hierarchical_data).forEach(([key, value]) => {
            // Skip internal metadata keys
            if (key.startsWith('_')) return;
            
            const sectionName = formatFieldName(key); // Strip page suffixes
            const sectionId = key.toLowerCase();
            
            if (!sectionMap.has(sectionId)) {
              sectionMap.set(sectionId, {
                id: sectionId,
                name: sectionName,
                order: sectionMap.size
              });
            }
          });
        }
        
        const extractedSections = Array.from(sectionMap.values());
        console.log('🔍 Extracted sections from fields:', extractedSections);
        setSections(extractedSections);
        setFields(editorFields);
      }
    } else {
      // Start with empty fields for new templates
      setFields([]);
    }
  }, [template]);

  // Helper functions now imported from utilities (arraysEqual, objectsEqual, formatFieldName)

  // Load from global state when component mounts (for template creation persistence)
  useEffect(() => {
    if (isCreatingNewTemplate && newTemplateFields.length > 0 && !isLoadingFromGlobalRef.current) {
      // Only load if fields are actually different
      if (!arraysEqual(fields, newTemplateFields)) {
        isLoadingFromGlobalRef.current = true;
        // Removed verbose logging
        setFields(newTemplateFields);
        // Reset flag after state update
        setTimeout(() => {
          isLoadingFromGlobalRef.current = false;
        }, 0);
      }
    }
  }, [isCreatingNewTemplate, newTemplateFields]); // Removed fields from deps to prevent loop

  // Save to global state whenever fields change (for template creation persistence)
  useEffect(() => {
    if (isCreatingNewTemplate && fields.length > 0 && !isLoadingFromGlobalRef.current && !isSavingToGlobalRef.current) {
      // Only save if different from global state (using length and shallow comparison for performance)
      const fieldsChanged = fields.length !== newTemplateFields.length || 
        !arraysEqual(fields, newTemplateFields);
      
      if (fieldsChanged) {
        isSavingToGlobalRef.current = true;
        // Removed verbose logging to prevent console spam
        setNewTemplateFields(fields);
        setTimeout(() => {
          isSavingToGlobalRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isCreatingNewTemplate]); // newTemplateFields intentionally omitted to prevent loop

  // Load template metadata from global state when component mounts
  useEffect(() => {
    if (isCreatingNewTemplate && newTemplateData && !isLoadingFromGlobalRef.current) {
      const newMetadata = {
        name: newTemplateData.name || templateMetadata.name,
        description: newTemplateData.description || templateMetadata.description,
        document_type: newTemplateData.document_type || templateMetadata.document_type,
        version: newTemplateData.version || templateMetadata.version,
        status: newTemplateData.status || templateMetadata.status
      };
      
      // Only update if actually different
      if (!objectsEqual(templateMetadata, { ...templateMetadata, ...newMetadata })) {
        isLoadingFromGlobalRef.current = true;
        console.log('🔄 Loading template metadata from global state:', newTemplateData);
        setTemplateMetadata(prev => ({
          ...prev,
          ...newMetadata
        }));
        setTimeout(() => {
          isLoadingFromGlobalRef.current = false;
        }, 0);
      }
    }
  }, [isCreatingNewTemplate]); // Only run when isCreatingNewTemplate changes, not on every newTemplateData change

  // Save template metadata to global state whenever it changes
  useEffect(() => {
    if (isCreatingNewTemplate && !isLoadingFromGlobalRef.current && !isSavingToGlobalRef.current) {
      // Check if metadata actually changed before saving
      const currentGlobal = {
        name: newTemplateData?.name || '',
        description: newTemplateData?.description || '',
        document_type: newTemplateData?.document_type || 'General',
        version: newTemplateData?.version || '1.0',
        status: newTemplateData?.status || 'draft'
      };
      
      const newGlobal = {
        name: templateMetadata.name,
        description: templateMetadata.description,
        document_type: templateMetadata.document_type,
        version: templateMetadata.version,
        status: templateMetadata.status
      };
      
      if (!objectsEqual(currentGlobal, newGlobal)) {
        isSavingToGlobalRef.current = true;
        console.log('💾 Saving template metadata to global state:', templateMetadata);
        setNewTemplateData(prev => ({
          ...prev,
          ...newGlobal,
          metadata: prev?.metadata || {}
        }));
        setTimeout(() => {
          isSavingToGlobalRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateMetadata, isCreatingNewTemplate]); // newTemplateData intentionally omitted to prevent loop

  // Load sections from global state when component mounts
  useEffect(() => {
    if (isCreatingNewTemplate && newTemplateSections.length > 0 && !isLoadingFromGlobalRef.current) {
      // Only load if sections are actually different
      if (!arraysEqual(sections, newTemplateSections)) {
        isLoadingFromGlobalRef.current = true;
        console.log('🔄 Loading sections from global state:', newTemplateSections);
        setSections(newTemplateSections);
        setTimeout(() => {
          isLoadingFromGlobalRef.current = false;
        }, 0);
      }
    }
  }, [isCreatingNewTemplate]); // Only run when isCreatingNewTemplate changes

  // Save sections to global state whenever they change
  useEffect(() => {
    if (isCreatingNewTemplate && sections.length > 0 && !isLoadingFromGlobalRef.current && !isSavingToGlobalRef.current) {
      // Only save if different from global state
      const sectionsChanged = sections.length !== newTemplateSections.length || 
        !arraysEqual(sections, newTemplateSections);
      
      if (sectionsChanged) {
        isSavingToGlobalRef.current = true;
        console.log('💾 Saving sections to global state:', sections);
        setNewTemplateSections(sections);
        setTimeout(() => {
          isSavingToGlobalRef.current = false;
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isCreatingNewTemplate]); // newTemplateSections intentionally omitted to prevent loop

  // Load document image from global state when component mounts
  useEffect(() => {
    if (isCreatingNewTemplate && newTemplateDocumentImage) {
      console.log('🔄 Loading document image from global state');
      setDocumentImage(newTemplateDocumentImage);
    }
  }, [isCreatingNewTemplate, newTemplateDocumentImage]);

  // Save document image to global state whenever it changes
  useEffect(() => {
    if (isCreatingNewTemplate && documentImage) {
      console.log('💾 Saving document image to global state');
      setNewTemplateDocumentImage(documentImage);
    }
  }, [documentImage, isCreatingNewTemplate, setNewTemplateDocumentImage]);

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
    { value: 'textarea', label: 'Textarea', icon: FileText },
    { value: 'image', label: 'Image', icon: Image },
    { value: 'signature', label: 'Signature', icon: Signature },
    { value: 'table', label: 'Table', icon: Table },
    { value: 'select', label: 'Dropdown', icon: Type },
    { value: 'radio', label: 'Radio', icon: Type },
    { value: 'file', label: 'File Upload', icon: FileText }
  ];

  // Removed frontend heading creation logic - using backend LLM response headings

  // Temporary field state for new field creation (not added to fields array yet)
  const [tempNewField, setTempNewField] = useState<TemplateField | null>(null);

  // Handler for confirming field addition after configuration
  const handleAddField = (sectionId: string, newSectionName?: string) => {
    if (!tempNewField) return;
    
    let targetSectionId = sectionId;
    
    // If creating a new section, create it first
    if (newSectionName && newSectionName.trim()) {
      const newSectionId = newSectionName.toLowerCase().replace(/\s+/g, '_');
      const newSection = {
        id: newSectionId,
        name: newSectionName.trim(),
        order: sections.length
      };
      // Update sections state first
      setSections(prev => [...prev, newSection]);
      setSelectedSection(newSection.id);
      targetSectionId = newSection.id; // Use the new section ID
      
      toast({
        title: "Section created",
        description: `Created section "${newSection.name}"`
      });
    } else if (!sectionId || sectionId === '') {
      // If no section ID provided and not creating new section, use first available or create general
      if (sections.length > 0) {
        targetSectionId = sections[0].id;
      } else {
        const generalSection = {
          id: 'general',
          name: 'General',
          order: 0
        };
        setSections([generalSection]);
        targetSectionId = 'general';
      }
    }
    
    // Now add the field to the fields array with the configured properties
    // Make sure to use the correct section ID, not the one from tempNewField
    const configuredField: TemplateField = {
      ...tempNewField,
      section: targetSectionId, // Explicitly set the section (overrides any from tempNewField)
      label: tempNewField.label || 'New Field'
    };
    
    // Add field to the fields array
    setFields(prev => [...prev, configuredField]);
    setSelectedField(configuredField);
    
    // Clear temporary field and close dialog
    setTempNewField(null);
    setShowFieldPropertiesDialog(false);
  };

  // Handler for canceling field addition
  const handleCancelAddField = () => {
    setTempNewField(null);
    setSelectedField(null);
  };

  // Wrapper function - create temporary field and open dialog (don't add to fields array yet)
  const addNewField = () => {
    // Create a temporary field object (not added to fields array)
    const defaultSection = sections.length > 0 ? sections[0].id : 'general';
    const newTempField: TemplateField = {
      id: `temp_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
      section: defaultSection
    };
    
    setTempNewField(newTempField);
    setSelectedField(newTempField);
    
    // Open dialog immediately
    setShowFieldPropertiesDialog(true);
  };
  
  const saveSectionEdit = () => saveSectionEditFromHook(fields, setFields);

  const handleDocumentUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setDocumentImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    toast({
      title: "Document uploaded",
      description: `${file.name} is being processed...`
    });
  };


  const handleSaveClick = () => {
    // Validate that template has fields before allowing save
    if (fields.length === 0) {
      toast({
        title: "Cannot Save Empty Template",
        description: "Please add at least one field before saving the template",
        variant: "destructive"
      });
      return;
    }
    
    setShowSaveDialog(true);
  };

  // Utility functions now imported from template-editor/utils
  // convertFieldsToHierarchical - imported
  // formatFieldName - imported  
  // removePageSuffixesFromKeys - imported
  // convertHierarchicalToFields - imported

  // Old saveTemplate function removed - now using hook from useTemplateSave
  // Old convertFieldsToHierarchical function - now imported from utilities
  // Old removePageSuffixesFromKeys function - now imported from utilities
  // Old convertSectionsToHierarchical function - now imported from utilities

  const testExtraction = async () => {
    if (!documentImage) {
      toast({
        title: "No document available",
        description: "Upload a document or open a template with a sample document first.",
        variant: "destructive"
      });
      return;
    }

    await extractFields(
      documentImage,
      template.name || 'document',
      (extractedFields: TemplateField[], detectedSections: Array<{id: string, name: string, order: number}>) => {
        setFields(extractedFields);
        if (detectedSections.length > 0) {
          setSections(detectedSections);
        }
      },
      (hierarchicalData: any) => {
        setPreservedHierarchicalData(hierarchicalData);
        // Note: templateMetadata doesn't have a metadata property - that's stored separately
        // The hierarchical data is stored in preservedHierarchicalData and will be included when saving
      }
    );
  };



  const getFieldIcon = (type: TemplateField['type']) => {
    const iconMap = { 
      text: Type, 
      email: Mail, 
      phone: Phone, 
      date: Calendar, 
      number: Hash, 
      checkbox: CheckSquare, 
      select: Square,
      table: Square,  // Use Square icon for tables
      signature: Square  // Use Square icon for signatures
    };
    const Icon = iconMap[type] || Type;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <TemplateEditorHeader
        template={template}
        isExtracting={isExtracting}
        onClose={onClose}
        onExtract={testExtraction}
        onSave={handleSaveClick}
      />

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Canvas with Field Overlay */}
          <div className="lg:col-span-2">
            <DocumentTemplateCanvas
              fields={fields}
              selectedField={selectedField}
              onFieldSelect={setSelectedField}
              onFieldUpdate={handleFieldUpdate}
              onAddField={addNewField}
              documentImage={documentImage}
              onDocumentUpload={handleDocumentUpload}
            />
          </div>

          {/* All Fields Panel - Full Height */}
          <div className="h-[calc(100vh-150px)] flex flex-col">
            <FieldList
              fields={fields}
              selectedField={selectedField}
              selectedFields={selectedFields}
              sections={sections}
              editingSection={editingSection}
              editingSectionName={editingSectionName}
              onStartEditSection={startEditingSection}
              onSaveEditSection={saveSectionEdit}
              onCancelEditSection={cancelSectionEdit}
              onEditSectionNameChange={setEditingSectionName}
              onFieldSelect={(field) => {
                // Clear any temporary field when selecting an existing field
                setTempNewField(null);
                setSelectedField(field);
                setShowFieldPropertiesDialog(true);
              }}
              onFieldToggle={toggleFieldSelection}
              onDuplicateField={duplicateField}
              onDeleteField={deleteField}
              onSelectAll={selectAllFields}
              onClearSelection={clearSelection}
              getFieldIcon={getFieldIcon}
            />
          </div>
        </div>
      </div>

      <ExtractionDialog
        open={showExtraction}
        onOpenChange={setShowExtraction}
        extractionText={extractionText}
      />

      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        templateMetadata={templateMetadata}
        onMetadataChange={(updates) => setTemplateMetadata(prev => ({ ...prev, ...updates }))}
        onSave={async () => {
          if (!templateMetadata.name.trim()) {
            toast({
              title: "Validation Error",
              description: "Template name is required",
              variant: "destructive"
            });
            return;
          }
          
          if (fields.length === 0) {
            toast({
              title: "Cannot Save Empty Template",
              description: "Please add at least one field before saving",
              variant: "destructive"
            });
            return;
          }
          
          setShowSaveDialog(false);
          await saveTemplate();
        }}
        onCancel={() => setShowSaveDialog(false)}
        fieldsCount={fields.length}
        hasDocument={!!documentImage}
      />

      <SectionDialog
        open={showSectionDialog}
        onOpenChange={setShowSectionDialog}
        newSectionName={newSectionName}
        onSectionNameChange={setNewSectionName}
        onAdd={() => {
          addNewSection();
          setShowSectionDialog(false);
        }}
        onCancel={() => {
          setShowSectionDialog(false);
          setNewSectionName('');
        }}
      />

      <FieldPropertiesDialog
        open={showFieldPropertiesDialog}
        onOpenChange={(open) => {
          setShowFieldPropertiesDialog(open);
          if (!open && tempNewField) {
            // If dialog closes and we have a temp field, cancel it
            handleCancelAddField();
          }
        }}
        selectedField={tempNewField || selectedField}
        fieldTypes={fieldTypes}
        sections={sections}
        isNewField={!!tempNewField} // Explicitly pass flag indicating if this is a new field
        onFieldUpdate={(fieldId, updates) => {
          if (tempNewField && tempNewField.id === fieldId) {
            // Update temporary field
            setTempNewField(prev => prev ? { ...prev, ...updates } : null);
          } else {
            // Update existing field
            handleFieldUpdate(fieldId, updates);
          }
        }}
        onDeleteField={(fieldId) => {
          if (tempNewField && tempNewField.id === fieldId) {
            // Cancel temp field
            handleCancelAddField();
          } else {
            // Delete existing field
            deleteField(fieldId);
          }
        }}
        onAddField={handleAddField}
      />
    </div>
  );
};