import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import type { TemplateField } from "@/types/template";
import { formatFieldName } from "@/utils/templateUtils";
import { organizeDataIntoSections, type Section } from "@/utils/templateDataOrganizer";

interface TemplateFormPreviewProps {
  fields: TemplateField[];
  hierarchicalData?: any;
}

/**
 * Converts fields array to hierarchical structure for preview
 */
const convertFieldsToHierarchical = (fields: TemplateField[]): Record<string, any> => {
  const acc: Record<string, any> = {};
  
  // Group fields by section
  const sections: Record<string, any> = {};
  
  fields.forEach((field, index) => {
    const section = field.section || 'General';
    if (!sections[section]) {
      sections[section] = {};
    }
    
    // Create unique field key to handle duplicate labels
    const fieldKey = fields.filter(f => f && f.label === field.label).length > 1 
      ? `${field.label || 'Unnamed Field'} (${index + 1})` 
      : field.label || 'Unnamed Field';
    
    if (field.type === 'table' && field.columns) {
      // Check if this is a signature field first
      if (field.label && field.label.toLowerCase().includes('signature')) {
        // For signatures, don't create table structure - treat as regular field
        sections[section][fieldKey] = null;
      } else {
        // This is a regular table field - create table structure with dynamic sample data
        // Determine number of rows based on table type and complexity
        let numRows = 1; // Default minimum
        
        if (field.label && (field.label.toLowerCase().includes('charges') || field.label.toLowerCase().includes('items'))) {
          // For charges/items tables, show 2-3 rows to demonstrate structure
          numRows = 3;
        } else if (field.columns.length > 10) {
          // For complex tables with many columns, show fewer rows
          numRows = 2;
        } else if (field.columns.length > 5) {
          // For medium complexity tables, show 2-3 rows
          numRows = 3;
        } else {
          // For simple tables, show 1-2 rows
          numRows = 2;
        }
        
        const sampleRows = Array.from({ length: numRows }, (_, index) => {
          return field.columns!.reduce((row: Record<string, any>, col: string) => {
            row[col] = null; // Empty values for template preview
            return row;
          }, {});
        });
        
        sections[section][fieldKey] = sampleRows;
      }
    } else {
      // Regular field
      sections[section][fieldKey] = null;
    }
  });
  
  // Convert sections to the expected format
  Object.entries(sections).forEach(([sectionName, sectionData]) => {
    if (Object.keys(sectionData).length === 1) {
      // Single field in section - check if it's a table
      const [key, value] = Object.entries(sectionData)[0];
      if (Array.isArray(value)) {
        // This is a table - keep it as an array
        acc[key] = value;
      } else {
        // Regular field - flatten it
        acc[key] = value;
      }
    } else {
      // Multiple fields in section - keep as nested object
      acc[sectionName.toLowerCase().replace(/\s+/g, '_')] = sectionData;
    }
  });
  
  return acc;
};

export const TemplateFormPreview: React.FC<TemplateFormPreviewProps> = ({ fields, hierarchicalData }) => {
  // STRICTLY prioritize hierarchical data from metadata column
  // Only use fields column as last resort if hierarchical data doesn't exist or is invalid
  const hasValidHierarchicalData = hierarchicalData && 
    typeof hierarchicalData === 'object' && 
    !Array.isArray(hierarchicalData) &&
    Object.keys(hierarchicalData).length > 0;
  
  const mockExtractedData = hasValidHierarchicalData 
    ? hierarchicalData 
    : convertFieldsToHierarchical(fields);
  
  const sections = organizeDataIntoSections(mockExtractedData, fields);

  return (
    <div className="space-y-6 scrollbar-hide">
      {sections.length > 0 ? (
        sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Render signature fields if this section contains signatures */}
                {section.isSignature && section.signatures && (
                  <div className="space-y-4">
                    {section.signatures.map((signature, sigIndex: number) => (
                      <div key={sigIndex} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white h-[100px] w-[200px] flex items-center justify-center flex-shrink-0">
                          <div className="text-center">
                            <div className="w-8 h-8 bg-gray-400 rounded-full mx-auto mb-2"></div>
                            <span className="text-xs text-gray-500">Signature</span>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {signature.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render table if this section contains tabular data */}
                {section.isTable && section.tableData && Array.isArray(section.tableData) && section.tableHeaders && Array.isArray(section.tableHeaders) && section.tableHeaders.length > 0 && (
                  <div className="overflow-x-auto w-full max-w-full scrollbar-thin">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        {/* Render grouped headers if this is a grouped table */}
                        {section.isGroupedTable && section.groupedHeaders ? (
                          <>
                            {/* Parent header row - show ALL headers (single columns and grouped headers) */}
                            <tr className="bg-gray-100">
                              {section.groupedHeaders.map((groupHeader, idx) => {
                                if (groupHeader.colspan === 1) {
                                  // Single column - show in parent header row
                                  return (
                                    <th 
                                      key={idx}
                                      className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700 bg-gray-200"
                                    >
                                      {formatFieldName(groupHeader.name)}
                                    </th>
                                  );
                                } else {
                                  // Grouped header - span across sub-columns
                                  return (
                                    <th 
                                      key={idx} 
                                      colSpan={groupHeader.colspan}
                                      className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-800 bg-gray-200"
                                    >
                                      {formatFieldName(groupHeader.name)}
                                    </th>
                                  );
                                }
                              })}
                            </tr>
                            {/* Sub-header row - only show sub-headers for grouped columns, empty for single columns */}
                            {section.groupedHeaders.some((h) => h.colspan > 1) && (
                              <tr className="bg-gray-100">
                                {section.groupedHeaders.map((groupHeader, groupIdx) => {
                                  if (groupHeader.colspan === 1) {
                                    // Single column - empty cell in sub-header row
                                    return (
                                      <th 
                                        key={groupIdx}
                                        className="border border-gray-300 px-4 py-2 text-sm"
                                        style={{ visibility: 'hidden' }}
                                      >
                                        &nbsp;
                                      </th>
                                    );
                                  } else {
                                    // Multiple columns (grouped) - render sub-headers
                                    return groupHeader.subHeaders.map((subHeader, subIdx) => (
                                      <th 
                                        key={`${groupIdx}-${subIdx}`}
                                        className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap"
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
                          // Regular table - single header row
                          <tr className="bg-gray-100">
                            {section.tableHeaders.map((header: string, headerIndex: number) => (
                              <th key={headerIndex} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                                {formatFieldName(header)}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {section.tableData.length > 0 ? section.tableData.map((row: any, rowIndex: number) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {section.tableHeaders!.map((header: string, cellIndex: number) => {
                              const cellValue = row[header];
                              let displayValue: string | number = 'Not specified';
                              
                              if (cellValue !== null && cellValue !== undefined) {
                                displayValue = String(cellValue);
                              }
                              
                              return (
                                <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={section.tableHeaders.length} className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-500">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Render main section fields */}
                {section.fields && section.fields.length > 0 && (
                  <div className="space-y-3">
                    {section.fields.map((field: any, fieldIndex: number) => {
                      // Check if this is a signature field
                      if (field.name.toLowerCase().includes('signature') || field.name.toLowerCase().includes('signatory')) {
                        return (
                          <div key={fieldIndex} className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                              {field.name}
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[100px] flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-8 h-8 bg-gray-400 rounded-full mx-auto mb-2"></div>
                                <span className="text-sm text-gray-500">Signature Field</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Regular field rendering
                      return (
                        <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                          <div className="md:col-span-1">
                            <label className="text-sm font-medium text-gray-700 block">
                              {field.name}
                            </label>
                          </div>
                          <div className="md:col-span-1">
                            <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2 min-h-[36px] flex items-center">
                              {(() => {
                                const value = field.value;
                                if (value === null || value === undefined) {
                                  return 'Not specified';
                                }
                                
                                // Handle arrays
                                if (Array.isArray(value)) {
                                  if (value.length === 0) {
                                    return 'No items';
                                  }
                                  
                                  // Check if it's an array of objects (like table data)
                                  if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                                    // Render as a mini table
                                    const headers = Object.keys(value[0]);
                                    return (
                                      <div className="w-full">
                                        <div className="text-xs text-gray-500 mb-2">
                                          {value.length} item{value.length !== 1 ? 's' : ''}
                                        </div>
                                        <div className="overflow-x-auto w-full max-w-full scrollbar-hide">
                                          <table className="min-w-full text-xs border-collapse border border-gray-300">
                                            <thead>
                                              <tr className="bg-gray-100">
                                                {headers.map((header, idx) => (
                                                  <th key={idx} className="border border-gray-300 px-2 py-1 text-left whitespace-nowrap">
                                                    {formatFieldName(header)}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {value.slice(0, 3).map((item, rowIdx) => (
                                                <tr key={rowIdx}>
                                                  {headers.map((header, colIdx) => (
                                                    <td key={colIdx} className="border border-gray-300 px-2 py-1 whitespace-nowrap">
                                                      {item[header] || 'Not specified'}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          {value.length > 3 && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              ... and {value.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // Simple array of values
                                    return (
                                      <div className="flex flex-wrap gap-1">
                                        {value.map((item, idx) => (
                                          <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                            {String(item)}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  }
                                }
                                
                                // Handle objects - show as JSON string (subsections handle nested objects separately)
                                if (typeof value === 'object' && value !== null) {
                                  // Check if it's a signature-like object with label and bbox
                                  if (value.label && value.bbox) {
                                    return (
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium">{value.label}</div>
                                        <div className="text-xs text-gray-500">
                                          Position: {Array.isArray(value.bbox) ? value.bbox.join(', ') : value.bbox}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  // For other objects, show as JSON string (nested objects are handled as subsections)
                                  return JSON.stringify(value, null, 2);
                                }
                                
                                return String(value);
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Render subsections */}
                {section.subsections && section.subsections.map((subsection: any, subIndex: number) => (
                  <div key={subIndex} className="border-l-2 border-l-gray-200 pl-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {subsection.title}
                    </h4>
                    <div className="space-y-3">
                      {subsection.fields.map((field: any, fieldIndex: number) => (
                        <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                          <div className="md:col-span-1">
                            <label className="text-sm font-medium text-gray-600 block">
                              {field.name}
                            </label>
                          </div>
                          <div className="md:col-span-1">
                            <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2 min-h-[36px] flex items-center">
                              {field.value === null || field.value === undefined 
                                ? 'Not specified' 
                                : typeof field.value === 'object' && !Array.isArray(field.value)
                                  ? JSON.stringify(field.value, null, 2)
                                  : String(field.value)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No fields defined in this template</p>
          <p className="text-sm">Use the editor to add fields to this template</p>
        </div>
      )}
    </div>
  );
};

