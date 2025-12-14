import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Save } from "lucide-react";
import type { Template } from "@/hooks/useTemplateManager";

interface TemplateEditorHeaderProps {
  template: Template;
  isExtracting: boolean;
  onClose: () => void;
  onExtract: () => void;
  onSave: () => void;
}

export const TemplateEditorHeader = ({
  template,
  isExtracting,
  onClose,
  onExtract,
  onSave,
}: TemplateEditorHeaderProps) => {
  return (
    <div className="bg-card border-b border-border p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{template.name}</h1>
            <p className="text-sm text-muted-foreground">Version {template.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onExtract} disabled={isExtracting}>
            <Play className="mr-2 h-4 w-4" />
            {isExtracting ? 'Analyzing...' : 'Auto Detect Fields'}
          </Button>
          <Button variant="hero" onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
};

