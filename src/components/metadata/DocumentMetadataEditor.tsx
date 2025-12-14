import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tags, Save, Loader2 } from 'lucide-react';
import { useCustomMetadata, DocumentMetadata } from '@/hooks/useCustomMetadata';
import { format } from 'date-fns';

interface DocumentMetadataEditorProps {
  documentId: string;
  documentName: string;
}

export function DocumentMetadataEditor({
  documentId,
  documentName,
}: DocumentMetadataEditorProps) {
  const { definitions, getDocumentMetadata, setDocumentMetadata, isLoading } = useCustomMetadata();
  const [values, setValues] = useState<Record<string, string>>({});
  const [existingMetadata, setExistingMetadata] = useState<DocumentMetadata[]>([]);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isLoadingValues, setIsLoadingValues] = useState(true);

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingValues(true);
      const metadata = await getDocumentMetadata(documentId);
      setExistingMetadata(metadata);
      
      const valueMap: Record<string, string> = {};
      metadata.forEach(m => {
        valueMap[m.definition_id] = m.field_value || '';
      });
      setValues(valueMap);
      setIsLoadingValues(false);
    };
    
    loadMetadata();
  }, [documentId, getDocumentMetadata]);

  const handleSave = async (definitionId: string) => {
    setIsSaving(definitionId);
    try {
      await setDocumentMetadata(documentId, definitionId, values[definitionId] || null);
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading || isLoadingValues) {
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

  if (definitions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No custom metadata fields defined</p>
            <p className="text-xs mt-1">Create fields in the metadata settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary" />
          Custom Metadata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {definitions.map((def) => {
          const value = values[def.id] || '';
          const hasChanged = value !== (existingMetadata.find(m => m.definition_id === def.id)?.field_value || '');

          return (
            <div key={def.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={def.id} className="flex items-center gap-2">
                  {def.field_label}
                  {def.is_required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                </Label>
                {hasChanged && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSave(def.id)}
                    disabled={isSaving === def.id}
                  >
                    {isSaving === def.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>

              {def.field_type === 'text' && (
                <Input
                  id={def.id}
                  placeholder={def.description || `Enter ${def.field_label.toLowerCase()}`}
                  value={value}
                  onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                  onBlur={() => hasChanged && handleSave(def.id)}
                />
              )}

              {def.field_type === 'number' && (
                <Input
                  id={def.id}
                  type="number"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                  onBlur={() => hasChanged && handleSave(def.id)}
                />
              )}

              {def.field_type === 'date' && (
                <Input
                  id={def.id}
                  type="date"
                  value={value}
                  onChange={(e) => {
                    setValues(prev => ({ ...prev, [def.id]: e.target.value }));
                    handleSave(def.id);
                  }}
                />
              )}

              {def.field_type === 'boolean' && (
                <Switch
                  checked={value === 'true'}
                  onCheckedChange={(checked) => {
                    setValues(prev => ({ ...prev, [def.id]: checked.toString() }));
                    setDocumentMetadata(documentId, def.id, checked.toString());
                  }}
                />
              )}

              {(def.field_type === 'select' || def.field_type === 'multi-select') && def.options && (
                <Select
                  value={value}
                  onValueChange={(v) => {
                    setValues(prev => ({ ...prev, [def.id]: v }));
                    setDocumentMetadata(documentId, def.id, v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${def.field_label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {def.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {def.field_type === 'url' && (
                <Input
                  id={def.id}
                  type="url"
                  placeholder="https://..."
                  value={value}
                  onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                  onBlur={() => hasChanged && handleSave(def.id)}
                />
              )}

              {def.field_type === 'email' && (
                <Input
                  id={def.id}
                  type="email"
                  placeholder="email@example.com"
                  value={value}
                  onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                  onBlur={() => hasChanged && handleSave(def.id)}
                />
              )}

              {def.description && (
                <p className="text-xs text-muted-foreground">{def.description}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
