import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

interface FormStepHeaderProps {
  step: 'method' | 'design' | 'preview';
  isEditMode: boolean;
  formTitle?: string;
  templateName?: string;
  onBack?: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export const FormStepHeader: React.FC<FormStepHeaderProps> = ({
  step,
  isEditMode,
  formTitle,
  templateName,
  onBack,
  onPreview,
  onSave,
  saving = false
}) => {
  if (step === 'method') {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Form</h1>
          <p className="text-muted-foreground">Choose how you'd like to create your form</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Forms
        </Button>
      </div>
    );
  }

  if (step === 'design') {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isEditMode ? 'Edit Form' : 'Design Your Form'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? 'Update your form design and structure'
              : templateName
                ? `Based on ${templateName} template` 
                : 'Custom form design'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isEditMode && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {isEditMode && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forms
            </Button>
          )}
          {onPreview && (
            <Button variant="outline" onClick={onPreview}>
              Preview Form
            </Button>
          )}
          {onSave && (
            <Button variant="hero" onClick={onSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Save Form')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Preview Form</h1>
          <p className="text-muted-foreground">Read-only preview of your form</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Design
          </Button>
          {onSave && (
            <Button variant="hero" onClick={onSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Save Form')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

