import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tags,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Link,
  Mail,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { useCustomMetadata, FieldType, MetadataDefinition } from '@/hooks/useCustomMetadata';

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  'multi-select': <List className="h-4 w-4" />,
  url: <Link className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes/No',
  select: 'Single Select',
  'multi-select': 'Multi Select',
  url: 'URL',
  email: 'Email',
};

export function CustomMetadataManager() {
  const { definitions, isLoading, createDefinition, updateDefinition, deleteDefinition } = useCustomMetadata();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingField, setEditingField] = useState<MetadataDefinition | null>(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text' as FieldType,
    description: '',
    is_required: false,
    default_value: '',
    options: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      description: '',
      is_required: false,
      default_value: '',
      options: '',
    });
    setEditingField(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (def: MetadataDefinition) => {
    setFormData({
      field_name: def.field_name,
      field_label: def.field_label,
      field_type: def.field_type,
      description: def.description || '',
      is_required: def.is_required,
      default_value: def.default_value || '',
      options: def.options?.join(', ') || '',
    });
    setEditingField(def);
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.field_label.trim()) return;

    setIsSubmitting(true);
    try {
      const fieldName = formData.field_name || formData.field_label.toLowerCase().replace(/\s+/g, '_');
      const options = formData.options
        ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
        : null;

      if (editingField) {
        await updateDefinition(editingField.id, {
          field_name: fieldName,
          field_label: formData.field_label,
          field_type: formData.field_type,
          description: formData.description || null,
          is_required: formData.is_required,
          default_value: formData.default_value || null,
          options,
        });
      } else {
        await createDefinition({
          field_name: fieldName,
          field_label: formData.field_label,
          field_type: formData.field_type,
          description: formData.description || null,
          is_required: formData.is_required,
          default_value: formData.default_value || null,
          options,
          sort_order: definitions.length,
          is_active: true,
          validation_rules: null,
        });
      }
      setShowCreateDialog(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                Custom Metadata Fields
              </CardTitle>
              <CardDescription>
                Define custom fields to organize and categorize your documents
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {definitions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No custom fields yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Create custom metadata fields to add structured information to your documents,
                like project names, client IDs, or document categories.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Field
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {definitions.map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    
                    <div className="p-2 rounded-lg bg-primary/10">
                      {fieldTypeIcons[def.field_type]}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{def.field_label}</span>
                        {def.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{fieldTypeLabels[def.field_type]}</span>
                        {def.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{def.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(def)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteDefinition(def.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Edit Field' : 'Create Custom Field'}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? 'Update the field properties'
                : 'Add a new metadata field for your documents'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="field_label">Field Label *</Label>
                <Input
                  id="field_label"
                  placeholder="e.g., Project Name"
                  value={formData.field_label}
                  onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_type">Field Type</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, field_type: v as FieldType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(fieldTypeLabels).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {fieldTypeIcons[type as FieldType]}
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {(formData.field_type === 'select' || formData.field_type === 'multi-select') && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (comma separated)</Label>
                  <Input
                    id="options"
                    placeholder="Option 1, Option 2, Option 3"
                    value={formData.options}
                    onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="default_value">Default Value</Label>
                <Input
                  id="default_value"
                  placeholder="Optional default"
                  value={formData.default_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Required Field</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this field mandatory
                  </p>
                </div>
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingField ? (
                  'Save Changes'
                ) : (
                  'Create Field'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
