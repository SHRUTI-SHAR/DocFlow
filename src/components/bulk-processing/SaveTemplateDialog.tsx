/**
 * SaveTemplateDialog Component
 * Dialog to save mapping as a reusable template
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excelColumns: string[];
  mappings: Record<string, string | null>;
  onSave: (name: string, description?: string) => Promise<void>;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  open,
  onOpenChange,
  excelColumns,
  mappings,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mappedCount = Object.values(mappings).filter(v => v !== null).length;

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Mapping Template
          </DialogTitle>
          <DialogDescription>
            Save this mapping configuration to reuse with similar documents in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Info */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">
              {excelColumns.length} columns
            </Badge>
            <Badge variant="secondary">
              {mappedCount} mapped
            </Badge>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., PAK Document Mapping"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description (optional)</Label>
            <Textarea
              id="template-description"
              placeholder="Describe when to use this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Columns Preview */}
          <div className="space-y-2">
            <Label>Columns Included</Label>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-2 bg-muted/50 rounded-md">
              {excelColumns.map(col => (
                <Badge
                  key={col}
                  variant={mappings[col] ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
