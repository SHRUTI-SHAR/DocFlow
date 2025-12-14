import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Square, Trash2, Plus } from "lucide-react";
import type { TemplateField } from "@/types/template";

interface FieldPropertiesPanelProps {
  selectedField: TemplateField | null;
  fieldTypes: Array<{ value: TemplateField['type'], label: string, icon: React.ComponentType<{ className?: string }> }>;
  onFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
  onDeleteField: (fieldId: string) => void;
}

export const FieldPropertiesPanel = ({
  selectedField,
  fieldTypes,
  onFieldUpdate,
  onDeleteField,
}: FieldPropertiesPanelProps) => {
  if (!selectedField) {
    return (
      <Card className="p-3">
        <h3 className="text-base font-semibold mb-2">Field Properties</h3>
        <div className="text-center text-muted-foreground py-8">
          <Square className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Select a field to edit its properties</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <h3 className="text-base font-semibold mb-2">Field Properties</h3>
      
      <div className="space-y-2">
        <div>
          <Label htmlFor="field-label">Field Label</Label>
          <Input
            id="field-label"
            value={selectedField.label}
            onChange={(e) => onFieldUpdate(selectedField.id, { label: e.target.value })}
            className="h-8"
          />
        </div>

        <div>
          <Label htmlFor="field-type">Field Type</Label>
          <Select
            value={selectedField.type}
            onValueChange={(value: TemplateField['type']) => 
              onFieldUpdate(selectedField.id, { type: value })
            }
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
            checked={selectedField.required}
            onChange={(e) => onFieldUpdate(selectedField.id, { required: e.target.checked })}
            className="rounded border-border"
          />
          <Label htmlFor="field-required">Required field</Label>
        </div>

        {/* Table-specific properties */}
        {selectedField.type === 'table' && (
          <div className="space-y-2">
            <Label>Table Columns</Label>
            <div className="space-y-2">
              {selectedField.columns?.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={column}
                    onChange={(e) => {
                      const newColumns = [...(selectedField.columns || [])];
                      newColumns[index] = e.target.value;
                      onFieldUpdate(selectedField.id, { columns: newColumns });
                    }}
                    className="h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newColumns = (selectedField.columns || []).filter((_, i) => i !== index);
                      onFieldUpdate(selectedField.id, { columns: newColumns });
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newColumns = [...(selectedField.columns || []), 'New Column'];
                  onFieldUpdate(selectedField.id, { columns: newColumns });
                }}
                className="w-full h-8"
              >
                <Plus className="mr-2 h-3 w-3" />
                Add Column
              </Button>
            </div>
          </div>
        )}

        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full h-8"
          onClick={() => onDeleteField(selectedField.id)}
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Delete Field
        </Button>
      </div>
    </Card>
  );
};

