import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface TemplateMetadata {
  name: string;
  description: string;
  document_type: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  is_public: boolean;
}

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateMetadata: TemplateMetadata;
  onMetadataChange: (updates: Partial<TemplateMetadata>) => void;
  onSave: () => void;
  onCancel: () => void;
  fieldsCount: number;
  hasDocument: boolean;
}

export const SaveTemplateDialog = ({
  open,
  onOpenChange,
  templateMetadata,
  onMetadataChange,
  onSave,
  onCancel,
  fieldsCount,
  hasDocument,
}: SaveTemplateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
          <DialogDescription>
            Configure your template metadata before saving
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateMetadata.name}
                onChange={(e) => onMetadataChange({ name: e.target.value })}
                placeholder="e.g., Employee Information Form"
              />
            </div>
            <div>
              <Label htmlFor="template-type">Document Type *</Label>
              <Select 
                value={templateMetadata.document_type} 
                onValueChange={(value) => onMetadataChange({ document_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Form">Form</SelectItem>
                  <SelectItem value="Report">Report</SelectItem>
                  <SelectItem value="Application">Application</SelectItem>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                  <SelectItem value="Statement">Statement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={templateMetadata.description}
              onChange={(e) => onMetadataChange({ description: e.target.value })}
              placeholder="Brief description of this template"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="template-version">Version</Label>
              <Input
                id="template-version"
                value={templateMetadata.version}
                onChange={(e) => onMetadataChange({ version: e.target.value })}
                placeholder="1.0"
              />
            </div>
            <div>
              <Label htmlFor="template-status">Status</Label>
              <Select 
                value={templateMetadata.status} 
                onValueChange={(value: 'draft' | 'active' | 'archived') => onMetadataChange({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="template-public"
                checked={templateMetadata.is_public}
                onCheckedChange={(checked) => onMetadataChange({ is_public: checked })}
              />
              <Label htmlFor="template-public">Public Template</Label>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${fieldsCount === 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
            <h4 className="font-medium mb-2">Template Summary</h4>
            <div className="text-sm space-y-1">
              <p className={fieldsCount === 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                <strong>Fields:</strong> {fieldsCount} fields defined
                {fieldsCount === 0 && ' ⚠️'}
              </p>
              <p className="text-muted-foreground"><strong>Document:</strong> {hasDocument ? 'Document uploaded' : 'No document'}</p>
              {fieldsCount === 0 && (
                <p className="text-destructive text-xs mt-2">
                  ⚠️ Templates must have at least one field to be saved
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={onSave}
              disabled={!templateMetadata.name.trim() || fieldsCount === 0}
            >
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

