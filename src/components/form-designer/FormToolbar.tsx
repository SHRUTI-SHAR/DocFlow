import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Save } from 'lucide-react';

interface FormToolbarProps {
  formTitle: string;
  formDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onAddSection: (sectionName: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  hideSettings?: boolean;
  hideSaveButton?: boolean;
}

export const FormToolbar: React.FC<FormToolbarProps> = ({
  formTitle,
  formDescription,
  onTitleChange,
  onDescriptionChange,
  onAddSection,
  onSave,
  isSaving = false,
  hideSettings = false,
  hideSaveButton = false
}) => {
  const handleAddSection = () => {
    // Add section with a default name that can be edited later
    onAddSection('New Section');
  };

  return (
    <div className="space-y-6">
      {/* Form Settings */}
      {!hideSettings && (
        <div className="bg-card border rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="form-title">Form Title</Label>
              <Input
                id="form-title"
                value={formTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Enter form title"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="form-description">Form Description</Label>
              <textarea
                id="form-description"
                value={formDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Enter form description"
                className="mt-1 w-full p-2 border rounded-md resize-none h-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleAddSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
        {!hideSaveButton && (
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Form'}
          </Button>
        )}
      </div>
    </div>
  );
};
