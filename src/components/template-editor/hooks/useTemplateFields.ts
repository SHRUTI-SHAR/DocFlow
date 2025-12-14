/**
 * Hook for managing template fields
 */

import { useState, useCallback } from 'react';
import type { TemplateField } from '@/types/template';
import { useToast } from '@/hooks/use-toast';

interface UseTemplateFieldsReturn {
  fields: TemplateField[];
  selectedField: TemplateField | null;
  selectedFields: string[];
  setFields: React.Dispatch<React.SetStateAction<TemplateField[]>>;
  setSelectedField: React.Dispatch<React.SetStateAction<TemplateField | null>>;
  setSelectedFields: React.Dispatch<React.SetStateAction<string[]>>;
  handleFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
  addNewField: (selectedSection: string) => void;
  addTableField: (selectedSection: string) => void;
  deleteField: (fieldId: string) => void;
  duplicateField: (fieldId: string) => void;
  alignFields: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeFields: (direction: 'horizontal' | 'vertical') => void;
  autoArrangeFields: (fieldSpacing: number) => void;
  toggleFieldSelection: (fieldId: string, multiSelect: boolean) => void;
  selectAllFields: () => void;
  clearSelection: () => void;
}

export const useTemplateFields = (
  initialFields: TemplateField[] = [],
  initialSelectedField: TemplateField | null = null
): UseTemplateFieldsReturn => {
  const { toast } = useToast();
  const [fields, setFields] = useState<TemplateField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<TemplateField | null>(initialSelectedField);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const handleFieldUpdate = useCallback((fieldId: string, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    setSelectedField(prev => prev?.id === fieldId ? { ...prev, ...updates } : prev);
  }, []);

  const addNewField = useCallback((selectedSection: string) => {
    const newField: TemplateField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'New Field',
      required: false,
      section: selectedSection
    };
    setFields(prev => [...prev, newField]);
    setSelectedField(newField);
  }, []);

  const addTableField = useCallback((selectedSection: string) => {
    const newTableField: TemplateField = {
      id: Date.now().toString(),
      type: 'table',
      label: 'New Table',
      required: false,
      section: selectedSection,
      columns: ['Column 1', 'Column 2', 'Column 3']
    };
    setFields(prev => [...prev, newTableField]);
    setSelectedField(newTableField);
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    setSelectedField(prev => prev?.id === fieldId ? null : prev);
    setSelectedFields(prev => prev.filter(id => id !== fieldId));
  }, []);

  const duplicateField = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const newField: TemplateField = {
        ...field,
        id: Date.now().toString(),
        label: `${field.label} (Copy)`
      };
      setFields(prev => [...prev, newField]);
      setSelectedField(newField);
      toast({
        title: "Field duplicated",
        description: `${field.label} has been duplicated`
      });
    }
  }, [fields, toast]);

  const alignFields = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    toast({
      title: "Alignment not available",
      description: "Field positioning is not used in template creation",
      variant: "destructive"
    });
  }, [toast]);

  const distributeFields = useCallback((direction: 'horizontal' | 'vertical') => {
    toast({
      title: "Distribution not available",
      description: "Field positioning is not used in template creation",
      variant: "destructive"
    });
  }, [toast]);

  const autoArrangeFields = useCallback((fieldSpacing: number) => {
    toast({
      title: "Auto-arrange not available",
      description: "Field positioning is not used in template creation",
      variant: "destructive"
    });
  }, [toast]);

  const toggleFieldSelection = useCallback((fieldId: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedFields(prev => 
        prev.includes(fieldId) 
          ? prev.filter(id => id !== fieldId)
          : [...prev, fieldId]
      );
    } else {
      setSelectedFields([fieldId]);
    }
  }, []);

  const selectAllFields = useCallback(() => {
    setSelectedFields(fields.map(f => f.id));
  }, [fields]);

  const clearSelection = useCallback(() => {
    setSelectedFields([]);
    setSelectedField(null);
  }, []);

  return {
    fields,
    selectedField,
    selectedFields,
    setFields,
    setSelectedField,
    setSelectedFields,
    handleFieldUpdate,
    addNewField,
    addTableField,
    deleteField,
    duplicateField,
    alignFields,
    distributeFields,
    autoArrangeFields,
    toggleFieldSelection,
    selectAllFields,
    clearSelection
  };
};

