import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import type { TemplateField } from "@/types/template";
import { formatFieldName } from "../utils/templateHelpers";

interface FieldListProps {
  fields: TemplateField[];
  selectedField: TemplateField | null;
  selectedFields: string[];
  sections: Array<{id: string, name: string, order: number}>;
  // Section editing controls
  editingSection?: string | null;
  editingSectionName?: string;
  onStartEditSection?: (sectionId: string, currentName: string) => void;
  onSaveEditSection?: () => void;
  onCancelEditSection?: () => void;
  onEditSectionNameChange?: (name: string) => void;
  onFieldSelect: (fieldId: string | TemplateField) => void;
  onFieldToggle: (fieldId: string) => void;
  onDuplicateField: (fieldId: string) => void;
  onDeleteField: (fieldId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  getFieldIcon: (type: TemplateField['type']) => React.ReactNode;
}

export const FieldList = ({
  fields,
  selectedField,
  selectedFields,
  sections,
  onFieldSelect,
  onFieldToggle,
  onDuplicateField,
  onDeleteField,
  onSelectAll,
  onClearSelection,
  getFieldIcon,
  editingSection,
  editingSectionName,
  onStartEditSection,
  onSaveEditSection,
  onCancelEditSection,
  onEditSectionNameChange,
}: FieldListProps) => {
  // Group fields by section
  const groupedFields = fields.reduce((groups: Record<string, TemplateField[]>, field) => {
    const section = field.section || 'general';
    if (!groups[section]) {
      groups[section] = [];
    }
    groups[section].push(field);
    return groups;
  }, {});

  // Get section names from sections state
  const sectionMap = sections.reduce((map, section) => {
    // Use section.name directly (already formatted), don't format again
    map[section.id] = section.name;
    return map;
  }, {} as Record<string, string>);

  const renderTablePreview = (field: TemplateField) => {
    if (field.type !== 'table' || !field.columns || field.columns.length === 0) {
      return null;
    }

    const isGrouped = field.isGroupedTable === true;
    const hasHeaders = field.groupedHeaders && Array.isArray(field.groupedHeaders) && field.groupedHeaders.length > 0;

    return (
      <div className="ml-6 mt-2">
        <div className="text-xs text-muted-foreground font-medium mb-2">Table Preview:</div>
        <div className="border-2 border-border rounded-md overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                {isGrouped && hasHeaders ? (
                  <>
                    {/* Parent header row */}
                    <tr className="bg-muted/70">
                      {field.groupedHeaders!.map((groupHeader: any, idx: number) => {
                        if (groupHeader.colspan === 1) {
                          return (
                            <th 
                              key={idx}
                              className="px-2 py-1.5 text-left font-medium text-foreground border border-border text-xs bg-muted/80"
                            >
                              {formatFieldName(groupHeader.name)}
                            </th>
                          );
                        } else {
                          return (
                            <th 
                              key={idx} 
                              colSpan={groupHeader.colspan}
                              className="px-2 py-1.5 text-center font-bold text-foreground border border-border text-xs bg-muted/80"
                            >
                              {formatFieldName(groupHeader.name)}
                            </th>
                          );
                        }
                      })}
                    </tr>
                    {/* Sub-header row */}
                    {field.groupedHeaders!.some((h: any) => h.colspan > 1) && (
                      <tr className="bg-muted/70">
                        {field.groupedHeaders!.map((groupHeader: any, groupIdx: number) => {
                          if (groupHeader.colspan === 1) {
                            return (
                              <th 
                                key={groupIdx}
                                className="px-2 py-1.5 border border-border text-xs"
                                style={{ visibility: 'hidden' }}
                              >
                                &nbsp;
                              </th>
                            );
                          } else {
                            return groupHeader.subHeaders.map((subHeader: string, subIdx: number) => (
                              <th 
                                key={`${groupIdx}-${subIdx}`}
                                className="px-2 py-1.5 text-left font-medium text-foreground border border-border text-xs whitespace-nowrap"
                              >
                                {formatFieldName(subHeader)}
                              </th>
                            ));
                          }
                        })}
                      </tr>
                    )}
                  </>
                ) : (
                  // Regular table
                  <tr className="bg-muted/70">
                    {field.columns.map((column: string, index: number) => (
                      <th 
                        key={index}
                        className="px-2 py-1.5 text-left font-medium text-foreground border border-border text-xs whitespace-nowrap"
                      >
                        {formatFieldName(column)}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                <tr>
                  {field.columns.map((_column: string, index: number) => (
                    <td 
                      key={index}
                      className="px-2 py-2 border border-border text-muted-foreground whitespace-nowrap bg-background"
                    >
                      —
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">
          {field.columns.length} column{field.columns.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 flex flex-col flex-1 min-h-0">
      <h3 className="text-lg font-semibold mb-3">All Fields</h3>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {fields.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No fields added yet</p>
            <p className="text-xs mt-1">Click "Add Field" to create your first field</p>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={fields.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
                disabled={selectedFields.length === 0}
              >
                Clear
              </Button>
              <div className="flex-1 text-xs text-muted-foreground">
                {selectedFields.length} of {fields.length} selected
              </div>
            </div>

            {/* Fields List - Grouped by Sections (respect sections order) */}
            {(() => {
              const orderedSectionIds = [...sections]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map(s => s.id);

              // Include any sections present in fields but missing from sections list
              Object.keys(groupedFields).forEach((id) => {
                if (!orderedSectionIds.includes(id)) orderedSectionIds.push(id);
              });

              return orderedSectionIds.map((sectionId) => {
                const sectionFields = groupedFields[sectionId] || [];
                if (sectionFields.length === 0) return null;
                // Use section name from map, or format the section ID (removing page suffixes and parent paths)
                let sectionName = sectionMap[sectionId];
                if (!sectionName) {
                  // Fallback: extract just the last meaningful part(s) of the section ID
                  // This handles cases like "parent_section_child_section" -> "Child Section"
                  const parts = sectionId.split('_');
                  // Try to find a meaningful suffix (last 1-2 parts, avoiding single-letter parts)
                  let meaningfulParts: string[] = [];
                  for (let i = parts.length - 1; i >= 0 && meaningfulParts.length < 2; i--) {
                    const part = parts[i];
                    // Remove page suffixes
                    const cleanedPart = part
                      .replace(/_page_\d+$/i, '')
                      .replace(/[_\s]page\s*\d+$/i, '')
                      .replace(/\s+page\s+\d+$/i, '');
                    if (cleanedPart.length > 1) { // Skip single-letter parts
                      meaningfulParts.unshift(cleanedPart);
                    }
                  }
                  // Use last 1-2 meaningful parts
                  const finalParts = meaningfulParts.length > 0 
                    ? meaningfulParts.slice(-2) 
                    : [parts[parts.length - 1]];
                  sectionName = formatFieldName(finalParts.join('_'));
                }
              const isSingleTable = sectionFields.length === 1 && sectionFields[0].type === 'table' && 
                                    sectionFields[0].label.toLowerCase() === sectionName.toLowerCase();

              return (
                <div key={sectionId} className="space-y-2">
                  {/* Section Header (editable) */}
                  {sectionName && (
                    <div className="pt-2 pb-1 border-b border-border">
                      {editingSection === sectionId ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingSectionName || ''}
                            onChange={(e) => onEditSectionNameChange && onEditSectionNameChange(e.target.value)}
                            className="h-7 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveEditSection && onSaveEditSection();
                              if (e.key === 'Escape') onCancelEditSection && onCancelEditSection();
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => onSaveEditSection && onSaveEditSection()} className="h-7 px-2">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => onCancelEditSection && onCancelEditSection()} className="h-7 px-2">Cancel</Button>
                        </div>
                      ) : (
                        <div 
                          className="text-sm font-semibold text-foreground cursor-pointer hover:opacity-80"
                          title="Click to rename section"
                          onClick={() => onStartEditSection && onStartEditSection(sectionId, sectionName)}
                        >
                          {sectionName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fields in this section */}
                  {sectionFields.map((field) => {
                    const isSelected = selectedFields.includes(field.id) || selectedField?.id === field.id;
                    
                    return (
                      <div key={field.id} className={isSingleTable ? "ml-4" : "ml-4"}>
                        {!isSingleTable && (
                          <div 
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-smooth group ${
                              isSelected
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:bg-accent'
                            }`}
                            onClick={() => {
                              onFieldSelect(field);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {getFieldIcon(field.type)}
                              <div>
                                <div className="font-medium text-sm">{field.label}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {field.type} {field.required && '• Required'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateField(field.id);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteField(field.id);
                                  }}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show table preview */}
                        {renderTablePreview(field)}
                      </div>
                    );
                  })}
                </div>
              );
              });
            })()}
          </>
        )}
      </div>
    </Card>
  );
};

