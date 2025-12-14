import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save } from "lucide-react";
import type { TemplateField } from "@/types/template";
import { useState, useEffect } from "react";

interface FieldPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedField: TemplateField | null;
  fieldTypes: Array<{ value: TemplateField['type'], label: string, icon: React.ComponentType<{ className?: string }> }>;
  sections: Array<{id: string, name: string, order: number}>;
  onFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
  onDeleteField: (fieldId: string) => void;
  onAddField: (sectionId: string, newSectionName?: string) => void;
  isNewField?: boolean; // Explicit flag to indicate if this is a new field
}

export const FieldPropertiesDialog = ({
  open,
  onOpenChange,
  selectedField,
  fieldTypes,
  sections,
  onFieldUpdate,
  onDeleteField,
  onAddField,
  isNewField: isNewFieldProp,
}: FieldPropertiesDialogProps) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [wasOpen, setWasOpen] = useState(false);
  
  // Local state for field properties (only for existing fields)
  const [localFieldLabel, setLocalFieldLabel] = useState<string>('');
  const [localFieldType, setLocalFieldType] = useState<TemplateField['type']>('text');
  const [localFieldRequired, setLocalFieldRequired] = useState<boolean>(false);
  const [localFieldColumns, setLocalFieldColumns] = useState<string[]>([]);

  // Initialize selected section and local field state when dialog opens (not on every selectedField change)
  useEffect(() => {
    // Only reset state when dialog transitions from closed to open
    if (open && !wasOpen && selectedField) {
      if (selectedField.section) {
        setSelectedSectionId(selectedField.section);
      } else if (sections.length > 0) {
        setSelectedSectionId(sections[0].id);
      } else {
        setSelectedSectionId('');
      }
      setIsCreatingNewSection(false);
      setNewSectionName('');
      
      // Initialize local state for existing fields (not for new fields)
      if (!isNewFieldProp) {
        setLocalFieldLabel(selectedField.label || '');
        setLocalFieldType(selectedField.type || 'text');
        setLocalFieldRequired(selectedField.required || false);
        setLocalFieldColumns(selectedField.columns || []);
      }
    }
    
    // Track dialog open state
    if (open) {
      setWasOpen(true);
    } else {
      setWasOpen(false);
    }
  }, [open, wasOpen, selectedField, sections, isNewFieldProp]);

  if (!selectedField) {
    return null;
  }

  // Check if this is a new field - use prop if provided, otherwise check if ID starts with "temp_" or label is "New Field"
  const isNewField = isNewFieldProp !== undefined 
    ? isNewFieldProp 
    : (selectedField.id.startsWith('temp_') || selectedField.label === 'New Field');

  const handleSectionChange = (value: string) => {
    if (value === '__create_new__') {
      setIsCreatingNewSection(true);
      setSelectedSectionId('');
    } else {
      setIsCreatingNewSection(false);
      setSelectedSectionId(value);
      // For new fields, update immediately. For existing fields, update happens on save.
      if (isNewField && selectedField.section !== value) {
        onFieldUpdate(selectedField.id, { section: value });
      }
    }
  };
  
  const handleSaveChanges = () => {
    if (!selectedField || isNewField) return;
    
    // Apply all changes at once
    const updates: Partial<TemplateField> = {
      label: localFieldLabel,
      type: localFieldType,
      required: localFieldRequired,
      section: selectedSectionId,
    };
    
    if (localFieldType === 'table') {
      updates.columns = localFieldColumns;
    }
    
    onFieldUpdate(selectedField.id, updates);
    onOpenChange(false);
  };
  
  const handleCancel = () => {
    // Reset local state to original values
    if (selectedField && !isNewField) {
      setLocalFieldLabel(selectedField.label || '');
      setLocalFieldType(selectedField.type || 'text');
      setLocalFieldRequired(selectedField.required || false);
      setLocalFieldColumns(selectedField.columns || []);
      if (selectedField.section) {
        setSelectedSectionId(selectedField.section);
      }
    }
    setIsCreatingNewSection(false);
    setNewSectionName('');
    onOpenChange(false);
  };

  const handleAddField = () => {
    if (isNewField) {
      // For new fields, add to selected section or create new section
      if (isCreatingNewSection && newSectionName.trim()) {
        // When creating new section, pass empty string for sectionId and the new section name
        onAddField('', newSectionName.trim());
      } else if (selectedSectionId && selectedSectionId !== '') {
        // When selecting existing section, pass the section ID
        onAddField(selectedSectionId);
      } else {
        // Fallback: use the section from the selectedField if available
        const fallbackSectionId = selectedField.section || '';
        onAddField(fallbackSectionId);
      }
      // Dialog will be closed by parent component after field is added
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNewField ? 'Add New Field' : 'Field Properties'}</DialogTitle>
          <DialogDescription>
            {isNewField ? 'Configure the properties for your new field' : 'Edit the properties of this field'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Section Selection */}
          <div>
            <Label htmlFor="field-section">Section</Label>
            <Select 
              value={isCreatingNewSection ? '__create_new__' : (selectedSectionId || (sections.length > 0 ? sections[0].id : ''))} 
              onValueChange={handleSectionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.length > 0 ? (
                  sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__create_new__" disabled>
                    No sections available
                  </SelectItem>
                )}
                <SelectItem value="__create_new__">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Section
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New Section Name Input */}
          {isCreatingNewSection && (
            <div>
              <Label htmlFor="new-section-name">New Section Name</Label>
              <Input
                id="new-section-name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Enter section name"
                className="h-9"
                autoFocus
              />
            </div>
          )}

          <div>
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={isNewField ? selectedField.label : localFieldLabel}
              onChange={(e) => {
                if (isNewField) {
                  onFieldUpdate(selectedField.id, { label: e.target.value });
                } else {
                  setLocalFieldLabel(e.target.value);
                }
              }}
              className="h-9"
              placeholder="Enter field label"
            />
          </div>

          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={isNewField ? selectedField.type : localFieldType}
              onValueChange={(value: TemplateField['type']) => {
                if (isNewField) {
                  onFieldUpdate(selectedField.id, { type: value });
                } else {
                  setLocalFieldType(value);
                  // Clear columns if not a table
                  if (value !== 'table') {
                    setLocalFieldColumns([]);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border shadow-strong z-50">
                {fieldTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="field-required"
              checked={isNewField ? selectedField.required : localFieldRequired}
              onChange={(e) => {
                if (isNewField) {
                  onFieldUpdate(selectedField.id, { required: e.target.checked });
                } else {
                  setLocalFieldRequired(e.target.checked);
                }
              }}
              className="rounded border-border"
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {/* Table-specific properties */}
          {(isNewField ? selectedField.type : localFieldType) === 'table' && (
            <div className="space-y-2">
              <Label>Table Columns</Label>
              <div className="space-y-2">
                {(isNewField ? selectedField.columns : localFieldColumns)?.map((column, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={column}
                      onChange={(e) => {
                        if (isNewField) {
                          const newColumns = [...(selectedField.columns || [])];
                          newColumns[index] = e.target.value;
                          onFieldUpdate(selectedField.id, { columns: newColumns });
                        } else {
                          const newColumns = [...localFieldColumns];
                          newColumns[index] = e.target.value;
                          setLocalFieldColumns(newColumns);
                        }
                      }}
                      className="h-9"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isNewField) {
                          const newColumns = (selectedField.columns || []).filter((_, i) => i !== index);
                          onFieldUpdate(selectedField.id, { columns: newColumns });
                        } else {
                          const newColumns = localFieldColumns.filter((_, i) => i !== index);
                          setLocalFieldColumns(newColumns);
                        }
                      }}
                      className="h-9 w-9 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isNewField) {
                      const newColumns = [...(selectedField.columns || []), 'New Column'];
                      onFieldUpdate(selectedField.id, { columns: newColumns });
                    } else {
                      setLocalFieldColumns([...localFieldColumns, 'New Column']);
                    }
                  }}
                  className="w-full h-9"
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Column
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            {isNewField ? (
              <>
                <Button variant="outline" onClick={() => {
                  onDeleteField(selectedField.id);
                  onOpenChange(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleAddField}
                  disabled={
                    !selectedField.label.trim() || 
                    (!isCreatingNewSection && !selectedSectionId) ||
                    (isCreatingNewSection && !newSectionName.trim())
                  }
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Field
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  onClick={handleSaveChanges}
                  disabled={!localFieldLabel.trim()}
                >
                  <Save className="mr-2 h-3 w-3" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

