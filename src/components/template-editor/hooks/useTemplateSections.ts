/**
 * Hook for managing template sections
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Section {
  id: string;
  name: string;
  order: number;
}

interface UseTemplateSectionsReturn {
  sections: Section[];
  selectedSection: string;
  showSectionDialog: boolean;
  newSectionName: string;
  editingSection: string | null;
  editingSectionName: string;
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  setSelectedSection: React.Dispatch<React.SetStateAction<string>>;
  setShowSectionDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setNewSectionName: React.Dispatch<React.SetStateAction<string>>;
  setEditingSection: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingSectionName: React.Dispatch<React.SetStateAction<string>>;
  addNewSection: () => void;
  startEditingSection: (sectionId: string, currentName: string) => void;
  saveSectionEdit: (fields: any[], setFields: React.Dispatch<React.SetStateAction<any[]>>) => void;
  cancelSectionEdit: () => void;
}

export const useTemplateSections = (
  initialSections: Section[] = [{ id: 'general', name: 'General', order: 0 }],
  initialSelectedSection: string = 'general'
): UseTemplateSectionsReturn => {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [selectedSection, setSelectedSection] = useState<string>(initialSelectedSection);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  const addNewSection = useCallback(() => {
    if (newSectionName.trim()) {
      const newSection: Section = {
        id: newSectionName.toLowerCase().replace(/\s+/g, '_'),
        name: newSectionName.trim(),
        order: sections.length
      };
      setSections(prev => [...prev, newSection]);
      setSelectedSection(newSection.id);
      setNewSectionName('');
      setShowSectionDialog(false);
      toast({
        title: "Section created",
        description: `Created section "${newSection.name}"`
      });
    }
  }, [newSectionName, sections.length, toast]);

  const startEditingSection = useCallback((sectionId: string, currentName: string) => {
    setEditingSection(sectionId);
    setEditingSectionName(currentName);
  }, []);

  const saveSectionEdit = useCallback((
    fields: any[],
    setFields: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    if (editingSection && editingSectionName.trim()) {
      const newName = editingSectionName.trim();
      const newId = newName.toLowerCase().replace(/\s+/g, '_');
      
      // Update sections
      setSections(prev => prev.map(section => 
        section.id === editingSection 
          ? { ...section, id: newId, name: newName }
          : section
      ));
      
      // Update fields that belong to this section
      setFields(prev => prev.map(field => 
        field.section === editingSection 
          ? { ...field, section: newId }
          : field
      ));
      
      // Update selected section if it was the one being edited
      setSelectedSection(prev => prev === editingSection ? newId : prev);
      
      setEditingSection(null);
      setEditingSectionName('');
      
      toast({
        title: "Section renamed",
        description: `Section renamed to "${newName}"`
      });
    }
  }, [editingSection, editingSectionName, toast]);

  const cancelSectionEdit = useCallback(() => {
    setEditingSection(null);
    setEditingSectionName('');
  }, []);

  return {
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
    saveSectionEdit,
    cancelSectionEdit
  };
};

