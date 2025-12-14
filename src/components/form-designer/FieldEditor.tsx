import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { TemplateField } from '@/types/template';

// Central list of field types that can be added via the + menu
const AVAILABLE_FIELD_TYPES: Array<{ type: TemplateField['type'] | string; label: string }> = [
  { type: 'text', label: 'Text Field' },
  { type: 'email', label: 'Email' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'select', label: 'Select (Dropdown)' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'phone', label: 'Phone' },
  { type: 'radio', label: 'Radio Group' },
  { type: 'file', label: 'File Upload' },
  { type: 'table', label: 'Table' },
  { type: 'signature', label: 'Signature' },
];

interface FieldEditorProps {
  field: TemplateField | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: TemplateField) => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({ field, isOpen, onClose, onSave }) => {
  const [editingField, setEditingField] = React.useState<TemplateField | null>(field);

  React.useEffect(() => {
    setEditingField(field);
  }, [field]);

  if (!editingField) return null;

  const handleSave = () => {
    onSave(editingField);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Field: {editingField.label}</DialogTitle>
          <DialogDescription>
            Configure the properties of this form field.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Field Label */}
          <div>
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={editingField.label}
              onChange={(e) => setEditingField(prev => prev ? { ...prev, label: e.target.value } : null)}
            />
          </div>
          
          {/* Field Type */}
          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={editingField.type}
              onValueChange={(value) => setEditingField(prev => {
                if (!prev) return null;
                const newField = { ...prev, type: value as any };
                // Initialize defaults for new types
                if (value === 'table' && !newField.columns) newField.columns = ['Column 1', 'Column 2'];
                if (value === 'select' && !newField.options) newField.options = ['Option 1', 'Option 2'];
                if (['checkbox', 'radio'].includes(value) && !newField.options) newField.options = ['Option 1', 'Option 2'];
                return newField;
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {AVAILABLE_FIELD_TYPES.map(type => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Required field checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="field-required"
              checked={editingField.required}
              onChange={(e) => setEditingField(prev => prev ? { ...prev, required: e.target.checked } : null)}
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {/* Table-specific settings */}
          {editingField.type === 'table' && (
            <div>
              <Label>Table Columns</Label>
              <div className="space-y-2 mt-2">
                {(editingField.columns || []).map((column, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={column}
                      onChange={(e) => {
                        const newColumns = [...(editingField.columns || [])];
                        newColumns[index] = e.target.value;
                        setEditingField(prev => prev ? { ...prev, columns: newColumns } : null);
                      }}
                      placeholder={`Column ${index + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newColumns = (editingField.columns || []).filter((_, i) => i !== index);
                        setEditingField(prev => prev ? { ...prev, columns: newColumns } : null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newColumns = [...(editingField.columns || []), `Column ${(editingField.columns?.length || 0) + 1}`];
                    setEditingField(prev => prev ? { ...prev, columns: newColumns } : null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>
            </div>
          )}

          {/* Select-specific settings */}
          {editingField.type === 'select' && (
            <div>
              <Label>Select Options</Label>
              <div className="space-y-2 mt-2">
                {(editingField.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editingField.options || [])];
                        newOptions[index] = e.target.value;
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = (editingField.options || []).filter((_, i) => i !== index);
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(editingField.options || []), `Option ${(editingField.options?.length || 0) + 1}`];
                    setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Checkbox-specific settings */}
          {editingField.type === 'checkbox' && (
            <div>
              <Label>Checkbox Options</Label>
              <div className="space-y-2 mt-2">
                {(editingField.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editingField.options || [])];
                        newOptions[index] = e.target.value;
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = (editingField.options || []).filter((_, i) => i !== index);
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(editingField.options || []), `Option ${(editingField.options?.length || 0) + 1}`];
                    setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Radio-specific settings */}
          {editingField.type === 'radio' && (
            <div>
              <Label>Radio Options</Label>
              <div className="space-y-2 mt-2">
                {(editingField.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editingField.options || [])];
                        newOptions[index] = e.target.value;
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOptions = (editingField.options || []).filter((_, i) => i !== index);
                        setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...(editingField.options || []), `Option ${(editingField.options?.length || 0) + 1}`];
                    setEditingField(prev => prev ? { ...prev, options: newOptions } : null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
