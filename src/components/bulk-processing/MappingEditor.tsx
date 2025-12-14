/**
 * MappingEditor Component
 * Edit field mappings with searchable combobox (optimized for large field lists)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  Search,
  Sparkles,
  XCircle,
  ChevronsUpDown,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MappingSuggestion {
  excel_column: string;
  suggested_field: string | null;
  confidence: number;
  sample_value: string | null;
  alternative_fields: string[];
}

interface AvailableField {
  field_name: string;
  field_label: string | null;
  field_type: string;
  field_group: string | null;
  sample_value: string | null;
  occurrence_count: number;
}

interface MappingEditorProps {
  excelColumns: string[];
  mappings: Record<string, string | null>;
  suggestions: MappingSuggestion[];
  availableFields: AvailableField[];
  onMappingChange: (column: string, fieldName: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}

// Searchable Field Selector Component (optimized for large lists)
const FieldSelector: React.FC<{
  value: string | null;
  fields: AvailableField[];
  suggestion?: MappingSuggestion;
  onChange: (value: string | null) => void;
  formatFieldName: (name: string) => string;
}> = ({ value, fields, suggestion, onChange, formatFieldName }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter and limit fields for performance
  const filteredFields = useMemo(() => {
    const term = search.toLowerCase();
    
    // Always show current value and suggestions first
    const priorityFields: AvailableField[] = [];
    const matchedFields: AvailableField[] = [];
    
    fields.forEach(field => {
      const matchesSearch = !term || 
        field.field_name.toLowerCase().includes(term) ||
        field.field_label?.toLowerCase().includes(term) ||
        field.sample_value?.toLowerCase().includes(term);
      
      if (!matchesSearch) return;
      
      // Priority: current value, suggested field, alternatives
      if (field.field_name === value) {
        priorityFields.unshift(field);
      } else if (field.field_name === suggestion?.suggested_field) {
        priorityFields.push(field);
      } else if (suggestion?.alternative_fields?.includes(field.field_name)) {
        priorityFields.push(field);
      } else {
        matchedFields.push(field);
      }
    });
    
    // Limit total results to prevent performance issues
    const MAX_RESULTS = 50;
    return [...priorityFields, ...matchedFields].slice(0, MAX_RESULTS);
  }, [fields, search, value, suggestion]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {value ? formatFieldName(value) : "Select field..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>
          
          {/* Clear option */}
          {value && (
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 border-b text-sm"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Clear mapping</span>
            </div>
          )}
          
          {/* AI Suggestion */}
          {suggestion?.suggested_field && suggestion.suggested_field !== value && (
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-primary/5 hover:bg-primary/10 border-b"
              onClick={() => {
                onChange(suggestion.suggested_field);
                setOpen(false);
              }}
            >
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-sm">{formatFieldName(suggestion.suggested_field)}</span>
                <span className="text-xs text-muted-foreground">AI suggested ({Math.round(suggestion.confidence * 100)}% confidence)</span>
              </div>
            </div>
          )}
          
          {/* Field List */}
          <div className="max-h-[250px] overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No fields found. Try a different search.
              </div>
            ) : (
              filteredFields.map(field => (
                <div
                  key={field.field_name}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50",
                    value === field.field_name && "bg-muted"
                  )}
                  onClick={() => {
                    onChange(field.field_name);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={cn(
                    "h-4 w-4",
                    value === field.field_name ? "opacity-100" : "opacity-0"
                  )} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm truncate">{formatFieldName(field.field_name)}</span>
                    {field.sample_value && (
                      <span className="text-xs text-muted-foreground truncate">
                        {field.sample_value.substring(0, 60)}
                      </span>
                    )}
                  </div>
                  {field.field_group && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {field.field_group.substring(0, 15)}
                    </Badge>
                  )}
                </div>
              ))
            )}
            {filteredFields.length >= 50 && (
              <div className="py-2 text-center text-xs text-muted-foreground border-t">
                Showing first 50 results. Type to search more...
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const MappingEditor: React.FC<MappingEditorProps> = ({
  excelColumns,
  mappings,
  suggestions,
  availableFields,
  onMappingChange,
  onBack,
  onNext
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Get suggestion for a column
  const getSuggestion = useCallback((column: string): MappingSuggestion | undefined => {
    return suggestions.find(s => s.excel_column === column);
  }, [suggestions]);

  // Get field details
  const getFieldDetails = useCallback((fieldName: string): AvailableField | undefined => {
    return availableFields.find(f => f.field_name === fieldName);
  }, [availableFields]);

  // Ensure unique columns (remove duplicates)
  const uniqueColumns = useMemo(() => [...new Set(excelColumns)], [excelColumns]);

  // Count mapped columns based on unique columns
  const mappedCount = useMemo(() => 
    uniqueColumns.filter(col => {
      const value = mappings[col];
      return value !== null && value !== undefined && value !== '';
    }).length,
  [mappings, uniqueColumns]);

  // Format field name for display
  const formatFieldName = useCallback((name: string) => {
    return name
      .replace(/[_\[\]\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Get confidence badge color
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  // Filter columns based on filter mode
  // A column is "mapped" if it has a non-null, non-empty mapping value
  const isMapped = (col: string) => {
    const value = mappings[col];
    return value !== null && value !== undefined && value !== '';
  };
  
  const displayedColumns = filterMode === 'unmapped' 
    ? uniqueColumns.filter(col => !isMapped(col))
    : filterMode === 'mapped'
    ? uniqueColumns.filter(col => isMapped(col))
    : uniqueColumns;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                <span className="font-medium">AI Mapping Suggestions</span>
              </div>
              <Badge variant="outline">
                {mappedCount} / {uniqueColumns.length} columns mapped
              </Badge>
              <Badge variant="secondary">
                {availableFields.length} fields available
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button 
                  variant={filterMode === 'all' ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setFilterMode('all')}
                  className="rounded-r-none"
                >
                  All ({uniqueColumns.length})
                </Button>
                <Button 
                  variant={filterMode === 'mapped' ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setFilterMode('mapped')}
                  className="rounded-none border-x"
                >
                  Mapped ({mappedCount})
                </Button>
                <Button 
                  variant={filterMode === 'unmapped' ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setFilterMode('unmapped')}
                  className="rounded-l-none"
                >
                  Unmapped ({uniqueColumns.length - mappedCount})
                </Button>
              </div>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={onNext}>
                Preview Export
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mapping Rows */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 border-b font-medium text-sm">
                <div className="col-span-3">Excel Column</div>
                <div className="col-span-5">Mapped Field</div>
                <div className="col-span-2">Sample Value</div>
                <div className="col-span-2">Confidence</div>
              </div>

              {/* Rows */}
              {displayedColumns.map((column) => {
                const suggestion = getSuggestion(column);
                const currentMapping = mappings[column];
                const fieldDetails = currentMapping ? getFieldDetails(currentMapping) : null;

                return (
                  <div key={column} className="border-b last:border-0">
                    {/* Main Row */}
                    <div className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/30">
                      {/* Excel Column */}
                      <div className="col-span-3">
                        <span className="font-medium text-sm">{column}</span>
                      </div>

                      {/* Field Selector */}
                      <div className="col-span-5">
                        <FieldSelector
                          value={currentMapping || null}
                          fields={availableFields}
                          suggestion={suggestion}
                          onChange={(value) => onMappingChange(column, value)}
                          formatFieldName={formatFieldName}
                        />
                      </div>

                      {/* Sample Value */}
                      <div className="col-span-2">
                        {suggestion?.sample_value ? (
                          <span className="text-xs text-muted-foreground truncate block">
                            {suggestion.sample_value.substring(0, 30)}
                            {suggestion.sample_value.length > 30 ? '...' : ''}
                          </span>
                        ) : fieldDetails?.sample_value ? (
                          <span className="text-xs text-muted-foreground truncate block">
                            {fieldDetails.sample_value.substring(0, 30)}
                            {fieldDetails.sample_value.length > 30 ? '...' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {currentMapping ? 'No sample' : '\u2014'}
                          </span>
                        )}
                      </div>

                      {/* Confidence */}
                      <div className="col-span-2 flex items-center gap-2">
                        {suggestion && suggestion.confidence > 0 ? (
                          <>
                            <Badge className={cn("text-xs", getConfidenceBadge(suggestion.confidence))}>
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                            {suggestion.confidence >= 0.8 && (
                              <Sparkles className="h-3 w-3 text-yellow-500" />
                            )}
                          </>
                        ) : currentMapping ? (
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {displayedColumns.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  All columns are mapped!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
        <Button onClick={onNext}>
          Preview Export
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
