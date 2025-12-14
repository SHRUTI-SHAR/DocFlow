import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Table, Signature } from 'lucide-react';
import type { TemplateField } from '@/types/template';

interface FieldRendererProps {
  field: TemplateField;
  onEdit: (field: TemplateField) => void;
  onDelete: (fieldId: string) => void;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field, onEdit, onDelete }) => {
  const [selectedRadio, setSelectedRadio] = React.useState<string>('');
  const [selectedCheckboxes, setSelectedCheckboxes] = React.useState<string[]>([]);
  const [values, setValues] = React.useState<Record<string, any>>({});
  const setValue = (key: string, val: any) => setValues(prev => ({ ...prev, [key]: val }));
  if (field.type === 'table') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            <span className="font-medium">{field.label}</span>
            <Badge variant="outline" className="text-xs">
              Table
            </Badge>
            {field.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(field)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(field.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Table Preview */}
        <div className="overflow-x-auto w-full max-w-full scrollbar-hide">
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted/50">
                {field.columns?.map((column, index) => (
                  <th key={index} className="border border-border px-3 py-2 text-left text-sm font-medium whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Dynamic sample rows: normalize schema-like arrays (one key per object) to 1 row */}
              {(() => {
                const rowsData = (field as any).rows as any[] | undefined;
                const looksLikeSchema = Array.isArray(rowsData) && rowsData.length > 0 && rowsData.every(r => typeof r === 'object' && r && Object.keys(r).length === 1);
                const sampleRowCount = looksLikeSchema ? 1 : (rowsData?.length || (field as any).previewRows || 1);
                return Array.from({ length: sampleRowCount }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {field.columns?.map((column, colIndex) => (
                    <td key={colIndex} className="border border-border px-3 py-2 whitespace-nowrap">
                      <div className="h-8 bg-background border border-border rounded px-2 text-sm text-muted-foreground flex items-center min-w-[100px]">
                        Sample data
                      </div>
                    </td>
                  ))}
                </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {(() => {
            const rowsData = (field as any).rows as any[] | undefined;
            const looksLikeSchema = Array.isArray(rowsData) && rowsData.length > 0 && rowsData.every(r => typeof r === 'object' && r && Object.keys(r).length === 1);
            const sampleRowCount = looksLikeSchema ? 1 : (rowsData?.length || (field as any).previewRows || 1);
            return `${field.columns?.length || 0} columns • ${sampleRowCount} sample row${sampleRowCount > 1 ? 's' : ''} shown`;
          })()}
        </div>
      </div>
    );
  }

  if (field.type === 'signature') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Signature className="h-4 w-4" />
            <span className="font-medium">{field.label}</span>
            <Badge variant="outline" className="text-xs">
              Signature
            </Badge>
            {field.required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(field)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(field.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Signature Preview */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-background">
          <Signature className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <div className="text-sm text-muted-foreground">Signature Area</div>
          <div className="text-xs text-muted-foreground mt-1">
            {field.width}x{field.height}px
          </div>
        </div>
      </div>
    );
  }

  // Regular fields
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.label}</span>
          <Badge variant="outline" className="text-xs">
            {field.type}
          </Badge>
          {field.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        
        {/* Type-specific preview */}
        <div className="mt-2">
          {field.type === 'text' && (
            <input
              className="h-8 w-64 border rounded px-2 text-sm"
              placeholder="Text input"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'email' && (
            <input
              className="h-8 w-64 border rounded px-2 text-sm"
              placeholder="email@example.com"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'number' && (
            <input
              className="h-8 w-40 border rounded px-2 text-sm"
              placeholder="123"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'date' && (
            <input
              className="h-8 w-40 border rounded px-2 text-sm"
              placeholder="YYYY-MM-DD"
              type="date"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'select' && (
            <select
              className="h-8 w-56 border rounded px-2 text-sm"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            >
              {(field.options || ['Option 1','Option 2']).map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {field.type === 'textarea' && (
            <textarea
              className="h-20 w-80 border rounded p-2 text-sm"
              placeholder="Multiline text"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'checkbox' && (
            <div className="space-y-2">
              {(field.options || ['Option 1', 'Option 2']).map((option, index) => (
                <label key={index} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    value={option}
                    checked={selectedCheckboxes.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCheckboxes(prev => [...prev, option]);
                      } else {
                        setSelectedCheckboxes(prev => prev.filter(opt => opt !== option));
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
          {field.type === 'phone' && (
            <input
              className="h-8 w-48 border rounded px-2 text-sm"
              placeholder="(000) 000-0000"
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
          {field.type === 'radio' && (
            <div className="space-y-2">
              {(field.options || ['Option 1', 'Option 2']).map((option, index) => (
                <label key={index} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name={`radio-${field.id}`} 
                    value={option}
                    checked={selectedRadio === option}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                    className="cursor-pointer"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
          {field.type === 'file' && (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                className="block w-72 text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                onChange={(e) => setValue(field.id, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              />
              {values[field.id] && typeof values[field.id] === 'object' && 'name' in (values[field.id] as any) && (
                <div className="text-xs text-muted-foreground">Selected: {(values[field.id] as File).name}</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(field)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(field.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
