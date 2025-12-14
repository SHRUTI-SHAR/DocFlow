import React, { useState } from 'react';
import { SimplifiedDocumentWorkflow } from "@/components/SimplifiedDocumentWorkflow";
import { ModeSelector } from "@/components/bulk-processing/ModeSelector";
import { BulkProcessingWizard } from "@/components/bulk-processing/BulkProcessingWizard";
import { BulkProcessingHub } from "@/components/bulk-processing/BulkProcessingHub";
import { BulkProcessingDashboard } from "@/components/bulk-processing/BulkProcessingDashboard";
import { ManualReviewQueue } from "@/components/bulk-processing/ManualReviewQueue";
import { JobDetailsView } from "@/components/bulk-processing/JobDetailsView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, MapPin, Mail, Building, GraduationCap } from 'lucide-react';
import { useDocumentProcessingContext } from '@/contexts/DocumentProcessingContext';
import { useBulkProcessing } from '@/contexts/BulkProcessingContext';

const Upload = () => {
  const {
    state: bulkState,
    setProcessingMode,
    setBulkProcessingView,
    setSelectedJobId
  } = useBulkProcessing();

  const [processedDocument, setProcessedDocument] = useState<any>(null);
  const { extractedData: globalExtractedData, isEditingData, editedData, setEditedData } = useDocumentProcessingContext();

  // Use state from context
  const processingMode = bulkState.processingMode;
  const bulkProcessingView = bulkState.bulkProcessingView;
  const selectedJobId = bulkState.selectedJobId;

  // Debug logging
  console.log('🔍 Upload component state:', {
    isEditingData,
    editedData,
    processedDocument: !!processedDocument,
    globalExtractedData: !!globalExtractedData
  });

  const handleWorkflowComplete = (result: { documentData: any; savedToDatabase: boolean }) => {
    setProcessedDocument(result.documentData);
    console.log('Workflow completed:', result);
  };

  const handleFieldChange = (sectionKey: string, fieldKey: string, value: string) => {
    console.log('🔄 Field change:', { sectionKey, fieldKey, value });
    setEditedData((prev: any) => {
      const newData = { ...prev };
      if (!newData[sectionKey]) {
        newData[sectionKey] = {};
      }
      newData[sectionKey][fieldKey] = value;
      console.log('📊 Updated editedData:', newData);
      return newData;
    });
  };

  // Helper function to get current field value (edited or original)
  const getCurrentFieldValue = (sectionKey: string, fieldKey: string, originalValue: any) => {
    return editedData[sectionKey]?.[fieldKey] ?? originalValue ?? '';
  };

  // Generic type helpers for universal rendering
  const isPrimitive = (val: any): boolean => (
    val === null || ['string', 'number', 'boolean'].includes(typeof val)
  );

  const isPlainObject = (val: any): boolean => (
    val !== null && typeof val === 'object' && !Array.isArray(val) && Object.prototype.toString.call(val) === '[object Object]'
  );

  // Helper function to find column order metadata (handles page suffixes and nested metadata)
  const findColumnOrder = (searchObj: any, sectionKey: string, tableArrayKey?: string): string[] | null => {
    if (!searchObj || typeof searchObj !== 'object') return null;

    const columnOrderKey = tableArrayKey
      ? `_${sectionKey}_${tableArrayKey}_columnOrder`
      : `_${sectionKey}_columnOrder`;

    // Debug: Log what we're looking for
    console.log('🔎 findColumnOrder called:', { sectionKey, tableArrayKey, columnOrderKey, availableKeys: Object.keys(searchObj).filter(k => k.includes('columnOrder')) });

    // First try exact match (without page suffix)
    let columnOrder = searchObj[columnOrderKey];
    if (Array.isArray(columnOrder) && columnOrder.length > 0) {
      console.log('✅ Found exact match:', columnOrderKey, columnOrder);
      return columnOrder;
    }

    // If not found, try to find key with page suffix pattern (e.g., _tax_summary_page_1_items_columnOrder)
    const escapedSectionKey = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (tableArrayKey) {
      const escapedTableArrayKey = String(tableArrayKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Pattern: _sectionKey_page_<digits>_tableArrayKey_columnOrder
      const pageSuffixPattern = new RegExp(`^_${escapedSectionKey}_page_\\d+_${escapedTableArrayKey}_columnOrder$`);
      const matchingKey = Object.keys(searchObj).find(k => pageSuffixPattern.test(k));
      if (matchingKey) {
        columnOrder = searchObj[matchingKey];
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          return columnOrder;
        }
      }
    } else {
      // Pattern: _sectionKey_page_<digits>_columnOrder
      const pageSuffixPattern = new RegExp(`^_${escapedSectionKey}_page_\\d+_columnOrder$`);
      const matchingKey = Object.keys(searchObj).find(k => pageSuffixPattern.test(k));
      if (matchingKey) {
        columnOrder = searchObj[matchingKey];
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          return columnOrder;
        }
      }
    }

    // Also try to find any key that matches the pattern after removing page suffixes
    const normalizedTargetKey = columnOrderKey;
    const normalizedMatchingKey = Object.keys(searchObj).find(k => {
      if (!k.endsWith('_columnOrder')) return false;
      // Remove page suffixes from the key and compare
      const normalizedKey = k.replace(/_page_\d+/gi, '').replace(/__+/g, '_');
      return normalizedKey === normalizedTargetKey;
    });
    if (normalizedMatchingKey) {
      columnOrder = searchObj[normalizedMatchingKey];
      if (Array.isArray(columnOrder) && columnOrder.length > 0) {
        return columnOrder;
      }
    }

    return null;
  };

  const isFlatPrimitiveObject = (obj: any): boolean => (
    isPlainObject(obj) && Object.values(obj).every(isPrimitive)
  );

  const arrayOfObjectsWithSameKeys = (arr: any[]): boolean => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    if (!arr.every(item => isPlainObject(item))) return false;
    const keys = Object.keys(arr[0]).sort().join('|');
    return arr.every(item => Object.keys(item).sort().join('|') === keys);
  };

  // Show mode selector if no mode is selected
  if (!processingMode) {
    return <ModeSelector onModeSelect={setProcessingMode} />;
  }

  // Show job details if selected
  if (selectedJobId) {
    return (
      <JobDetailsView
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
        onPause={(jobId: string) => {
          // TODO: API call
          console.log('Pause job:', jobId);
        }}
        onResume={(jobId: string) => {
          // TODO: API call
          console.log('Resume job:', jobId);
        }}
        onStop={(jobId: string) => {
          // TODO: API call
          console.log('Stop job:', jobId);
        }}
      />
    );
  }

  // Show bulk processing hub if bulk mode selected
  if (processingMode === 'bulk' && (bulkProcessingView === 'hub' || bulkProcessingView === null)) {
    return (
      <BulkProcessingHub
        onNavigateToDashboard={() => setBulkProcessingView('dashboard')}
        onNavigateToReviewQueue={() => setBulkProcessingView('review-queue')}
        onNavigateToCreateJob={() => setBulkProcessingView('wizard')}
        onBack={() => setProcessingMode(null)}
      />
    );
  }

  // Show dashboard
  if (bulkProcessingView === 'dashboard') {
    return (
      <div>
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <button
            type="button"
            onClick={() => setBulkProcessingView('hub')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
          >
            ← Back to Bulk Processing
          </button>
        </div>
        <BulkProcessingDashboard
          onCreateNewJob={() => setBulkProcessingView('wizard')}
          onViewJobDetails={(jobId: string) => {
            setSelectedJobId(jobId);
          }}
          onBack={() => setBulkProcessingView('hub')}
          showReviewQueue={false}
          onShowReviewQueue={(show: boolean) => {
            setBulkProcessingView(show ? 'review-queue' : 'dashboard');
          }}
        />
      </div>
    );
  }

  // Show review queue
  if (bulkProcessingView === 'review-queue') {
    return (
      <div>
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <button
            type="button"
            onClick={() => setBulkProcessingView('hub')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
          >
            ← Back to Bulk Processing
          </button>
        </div>
        <ManualReviewQueue
          onBack={() => setBulkProcessingView('hub')}
        />
      </div>
    );
  }

  // Show bulk processing wizard
  if (bulkProcessingView === 'wizard') {
    return (
      <BulkProcessingWizard
        onComplete={(config: any) => {
          // Job creation is handled in ReviewStep component
          // Navigate to dashboard after job creation
          setBulkProcessingView('dashboard');
        }}
        onCancel={() => setBulkProcessingView('hub')}
        onNavigateToDashboard={() => setBulkProcessingView('dashboard')}
      />
    );
  }

  // Show single document workflow
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mb-6 max-w-4xl mx-auto px-4">
        <button
          type="button"
          onClick={() => setProcessingMode(null)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          ← Back to Mode Selection
        </button>
      </div>
      <SimplifiedDocumentWorkflow onComplete={handleWorkflowComplete} />

      {/* Results Section - only show when document is processed */}
      {(processedDocument || globalExtractedData) && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8 rounded-lg border border-success/20 bg-success/10 p-6">
              <h2 className="text-xl font-semibold text-success mb-1">Document Processed & Saved</h2>
              <p className="text-muted-foreground">
                "{(processedDocument || globalExtractedData)?.filename}" has been processed, and {(() => {
                  const data = processedDocument || globalExtractedData;
                  const hierarchicalData = data?.hierarchicalData || data?.hierarchical_data;
                  if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
                    const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
                    return orderedKeys.length;
                  }
                  return 0;
                })()} sections were extracted and saved to the database.
              </p>
            </div>

            {(() => {
              const data = processedDocument || globalExtractedData;
              const hierarchicalData = data?.hierarchicalData || data?.hierarchical_data;

              if (!hierarchicalData || typeof hierarchicalData !== 'object' || Array.isArray(hierarchicalData)) {
                return null; // No hierarchical data to display
              }

              // Use hierarchical_data directly - no fields array conversion needed
              const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter((k: string) => !k.startsWith('_'));
              const fields = orderedKeys
                .filter((key: string) => hierarchicalData.hasOwnProperty(key) && !key.startsWith('_'))
                .map((key: string, index: number) => ({
                  id: `field_${index}`,
                  label: key,
                  value: hierarchicalData[key], // Keep as object/array, don't stringify
                  confidence: 0.85,
                  type: Array.isArray(hierarchicalData[key]) && hierarchicalData[key].length > 0 && typeof hierarchicalData[key][0] === 'object' ? 'table' : 'text'
                }));

              return (
                <div className="space-y-6">
                  {/* Parse and organize fields into sections */}
                  {(() => {

                    // Parse JSON values and extract nested fields
                    const parseFieldValue = (value: string): any => {
                      if (!value || typeof value !== 'string') return value;

                      const trimmedValue = value.trim();

                      // Check if it looks like JSON (starts with [ or {)
                      if (!trimmedValue.startsWith('[') && !trimmedValue.startsWith('{')) {
                        return value;
                      }

                      try {
                        // Try parsing as-is first
                        return JSON.parse(trimmedValue);
                      } catch (error1: any) {
                        try {
                          // Try replacing single quotes with double quotes
                          const cleanedValue = trimmedValue.replace(/'/g, '"');
                          return JSON.parse(cleanedValue);
                        } catch (error2: any) {
                          try {
                            // Try a more aggressive cleaning for Python-style dicts
                            let cleanedValue = trimmedValue
                              .replace(/'/g, '"')  // Replace single quotes
                              .replace(/True/g, 'true')  // Replace Python True
                              .replace(/False/g, 'false')  // Replace Python False
                              .replace(/None/g, 'null');  // Replace Python None
                            return JSON.parse(cleanedValue);
                          } catch (error3: any) {
                            return value;
                          }
                        }
                      }
                    };

                    // Get section icons
                    const getSectionIcon = (sectionName: string) => {
                      const name = sectionName.toLowerCase();
                      if (name.includes('document') || name.includes('info')) return <FileText className="h-4 w-4" />;
                      if (name.includes('personal') || name.includes('details')) return <User className="h-4 w-4" />;
                      if (name.includes('address') || name.includes('domicile') || name.includes('correspondence') || name.includes('permanent')) return <MapPin className="h-4 w-4" />;
                      if (name.includes('contact') || name.includes('email') || name.includes('mobile')) return <Mail className="h-4 w-4" />;
                      if (name.includes('category') || name.includes('government') || name.includes('employee')) return <Building className="h-4 w-4" />;
                      if (name.includes('education') || name.includes('qualification') || name.includes('preferential')) return <GraduationCap className="h-4 w-4" />;
                      return <FileText className="h-4 w-4" />;
                    };

                    // Format field names for display
                    const formatFieldName = (fieldName: string): string => {
                      // Remove page number suffixes (e.g., "_page_8", " Page 8", etc.)
                      const cleaned = fieldName
                        .replace(/_page_\d+$/i, '') // Remove "_page_8" at the end
                        .replace(/[_\s]page\s*\d+$/i, '') // Remove " page 8" or "_page8" at the end
                        .replace(/\s+page\s+\d+$/i, ''); // Remove " Page 8" at the end

                      return cleaned
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())
                        .replace(/\b\w+/g, word => {
                          // Handle common abbreviations and special cases
                          const specialCases: { [key: string]: string } = {
                            'Up': 'UP',
                            'Dob': 'Date of Birth',
                            'No': 'Number',
                            'Ut': 'UT',
                            'Pincode': 'PIN Code',
                            'Email': 'Email Address',
                            'Mobile': 'Mobile Number'
                          };
                          return specialCases[word] || word;
                        });
                    };

                    // Process fields and organize them
                    const sectionsMap: {
                      [key: string]: {
                        title: string;
                        icon: React.ReactNode;
                        fields: Array<{ name: string; originalName?: string; value: any }>;
                        subsections?: Array<{ title: string; fields: Array<{ name: string; originalName?: string; value: any }> }>;
                        isTable?: boolean;
                        isGroupedTable?: boolean;
                        tableData?: Array<Record<string, any>>;
                        tableHeaders?: string[];
                        groupedHeaders?: Array<{ name: string; colspan: number; subHeaders: string[] }>;
                      }
                    } = {};

                    // Helper to skip noisy keys like "Section Title"
                    const isSectionTitleKey = (key: string): boolean => {
                      const s = key.replace(/[:_]/g, ' ').toLowerCase().trim();
                      return s === 'section title' || s === 'section' || s === 'section name' || s === 'section header' || s === 'title';
                    };

                    // Helper to check if object structure represents a table (columns as keys, values as arrays)
                    const isColumnBasedTable = (obj: any): boolean => {
                      if (!isPlainObject(obj)) return false;
                      const entries = Object.entries(obj);
                      if (entries.length < 2) return false; // Need at least 2 columns

                      // Check if all values are arrays of same length
                      const firstArray = entries.find(([_, v]) => Array.isArray(v));
                      if (!firstArray || !Array.isArray(firstArray[1])) return false;

                      const expectedLength = firstArray[1].length;
                      if (expectedLength === 0) return false; // Need at least one row

                      // Check all values are arrays of same length (or primitives that can be treated as single-row)
                      const allArrays = entries.every(([_, v]) => {
                        return Array.isArray(v) && v.length === expectedLength;
                      });

                      return allArrays;
                    };

                    // Helper to convert column-based table to row-based table
                    const convertColumnBasedToRowBased = (obj: Record<string, any[]>): any[] => {
                      const columns = Object.keys(obj);
                      const firstColumn = obj[columns[0]];
                      if (!Array.isArray(firstColumn)) return [];

                      const rowCount = firstColumn.length;
                      return Array.from({ length: rowCount }, (_, rowIndex) => {
                        const row: Record<string, any> = {};
                        columns.forEach(column => {
                          const columnValues = obj[column];
                          row[column] = Array.isArray(columnValues) && columnValues[rowIndex] !== undefined
                            ? columnValues[rowIndex]
                            : null;
                        });
                        return row;
                      });
                    };

                    // Process fields in the order they appear (preserves LLM order)
                    // If hierarchicalData is available, process keys in their original order
                    let fieldsToProcess = fields;
                    if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
                      // Reorder fields to match hierarchicalData key order (use _keyOrder if available)
                      const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
                      fieldsToProcess = orderedKeys
                        .filter(key => {
                          // Filter out image_size - it's only for internal backend processing
                          const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '');
                          return normalizedKey !== 'imagesize';
                        })
                        .map(key => {
                          const field = fields.find(f => (f.label || f.name) === key);
                          return field || { label: key, value: hierarchicalData[key], confidence: 0.85 };
                        })
                        .filter(f => f !== undefined);
                    }

                    fieldsToProcess.forEach((field: any) => {
                      const sectionName = field.label || field.name || field.field || 'Unknown Section';

                      // Skip image_size section - it's only for internal backend processing (signature cropping)
                      // Check both original name and after formatting (handles "image_size", "Image Size", "image_size_page_8", etc.)
                      const normalizedOriginalName = sectionName.toLowerCase().replace(/[_\s]/g, '').replace(/page\d+/g, '');
                      if (normalizedOriginalName === 'imagesize' || normalizedOriginalName === 'imagesizepage') {
                        return;
                      }

                      const rawValue = field.value || field.valueText || '';
                      // If value is already an object/array (from hierarchical_data), use it directly
                      // Only parse if it's a string that might be JSON
                      const parsedValue = typeof rawValue === 'string' ? parseFieldValue(rawValue) : rawValue;

                      // Use ORIGINAL sectionName as key to prevent merging (keeps page suffixes for uniqueness)
                      // Format only for display title
                      const sectionKey = sectionName; // Keep original with page suffix if present
                      const formattedSectionName = formatFieldName(sectionName); // Format for display only

                      // Double check after formatting - skip if it's "Image Size" (formatted from image_size)
                      const normalizedFormattedName = formattedSectionName.toLowerCase().replace(/[_\s]/g, '');
                      if (normalizedFormattedName === 'imagesize') {
                        return;
                      }

                      if (typeof parsedValue === 'object' && parsedValue !== null && !Array.isArray(parsedValue)) {
                        // First check if this object contains an array that should be a table
                        // AND also contains other fields/objects (like grand_total)
                        const objectEntries = Object.entries(parsedValue);

                        // Check if there's a table array in this section
                        let hasTableArray = false;
                        let tableArrayKey: string | null = null;
                        let tableArrayData: any[] | null = null;

                        // First, check for nested grouped table structure (all values are arrays)
                        if (objectEntries.length > 1) {
                          const allAreArrays = objectEntries.every(([_, value]) => Array.isArray(value));
                          if (allAreArrays) {
                            const firstArray = objectEntries[0][1] as any[];
                            if (firstArray.length > 0 && typeof firstArray[0] === 'object' && firstArray[0] !== null) {
                              // Check if all arrays have objects with the same structure
                              const firstArrayKeys = Object.keys(firstArray[0]).sort();
                              const hasUniformStructure = objectEntries.every(([_, arr]) => {
                                const arrArray = arr as any[];
                                return arrArray.length > 0 &&
                                  arrArray.every(item =>
                                    typeof item === 'object' && item !== null &&
                                    Object.keys(item).sort().join(',') === firstArrayKeys.join(',')
                                  );
                              });

                              // Check for a common key across all objects (like "fy", "year", "period", etc.)
                              const commonKey = firstArrayKeys.find(key =>
                                ['fy', 'year', 'period', 'date', 'time_period'].includes(key.toLowerCase()) ||
                                key.toLowerCase().includes('year') ||
                                key.toLowerCase().includes('period')
                              ) || firstArrayKeys[0]; // Fallback to first key

                              if (hasUniformStructure && commonKey) {
                                // This is a grouped table - merge arrays by common key
                                const groupedTableData: any[] = [];
                                const allGroupKeys = objectEntries.map(([key, _]) => key);
                                const allSubHeaders = firstArrayKeys.filter(k => k !== commonKey);

                                // Get all unique values of common key across all arrays
                                const commonKeyValues = new Set<string>();
                                objectEntries.forEach(([_, arr]) => {
                                  (arr as any[]).forEach(item => {
                                    if (item[commonKey]) {
                                      commonKeyValues.add(String(item[commonKey]));
                                    }
                                  });
                                });

                                // Build merged rows
                                Array.from(commonKeyValues).forEach(commonValue => {
                                  const mergedRow: any = { [commonKey]: commonValue };

                                  objectEntries.forEach(([groupKey, arr]) => {
                                    const matchingItem = (arr as any[]).find(item => String(item[commonKey]) === commonValue);
                                    if (matchingItem) {
                                      allSubHeaders.forEach(subHeader => {
                                        const columnName = `${groupKey}_${subHeader}`;
                                        mergedRow[columnName] = matchingItem[subHeader];
                                      });
                                    } else {
                                      // Fill with nulls if no matching item
                                      allSubHeaders.forEach(subHeader => {
                                        const columnName = `${groupKey}_${subHeader}`;
                                        mergedRow[columnName] = null;
                                      });
                                    }
                                  });

                                  groupedTableData.push(mergedRow);
                                });

                                // Create grouped headers structure
                                const groupedHeaders = [
                                  { name: commonKey, colspan: 1, subHeaders: [] },
                                  ...allGroupKeys.map(groupKey => ({
                                    name: groupKey,
                                    colspan: allSubHeaders.length,
                                    subHeaders: allSubHeaders
                                  }))
                                ];

                                if (!sectionsMap[sectionKey]) {
                                  sectionsMap[sectionKey] = {
                                    title: formattedSectionName,
                                    icon: getSectionIcon(sectionName),
                                    fields: [],
                                    subsections: []
                                  };
                                }
                                const section = sectionsMap[sectionKey];
                                section.isTable = true;
                                section.isGroupedTable = true;
                                section.tableData = groupedTableData;
                                section.tableHeaders = [commonKey, ...allGroupKeys.flatMap(gk =>
                                  allSubHeaders.map(sh => `${gk}_${sh}`)
                                )];
                                section.groupedHeaders = groupedHeaders;
                                return; // Skip further processing
                              }
                            }
                          }
                        }

                        // Check if this is a column-based table structure
                        if (isColumnBasedTable(parsedValue)) {
                          // Convert to row-based table
                          const rowBasedData = convertColumnBasedToRowBased(parsedValue);
                          if (!sectionsMap[sectionKey]) {
                            sectionsMap[sectionKey] = {
                              title: formattedSectionName,
                              icon: getSectionIcon(sectionName),
                              fields: [],
                              subsections: []
                            };
                          }
                          const section = sectionsMap[sectionKey];
                          section.isTable = true;
                          section.tableData = rowBasedData;
                          section.tableHeaders = Object.keys(parsedValue);
                          return; // Skip further processing
                        }

                        // Check if this object contains an array that should be a table
                        // AND also contains other fields/objects (like grand_total)
                        // This handles cases like: { items: [{ ... }, { ... }], grand_total: { ... } }
                        objectEntries.forEach(([key, value]) => {
                          if (isSectionTitleKey(key)) return;
                          // Skip metadata keys (they're not fields)
                          if (key.startsWith('_')) return;

                          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                            const firstItem = value[0];
                            const columnCount = Object.keys(firstItem).length;
                            const hasMultipleColumns = columnCount >= 2;

                            // Check if all objects have the same keys (uniform structure = table)
                            const firstKeys = Object.keys(firstItem).sort().join('|');
                            const hasUniformStructure = value.length === 1 || value.every((item: any) =>
                              typeof item === 'object' && item !== null &&
                              Object.keys(item).sort().join('|') === firstKeys
                            );

                            if (hasUniformStructure && hasMultipleColumns) {
                              // This array should be rendered as a table
                              hasTableArray = true;
                              tableArrayKey = key;
                              tableArrayData = value;
                            }
                          }
                        });

                        // If we found a table array, process ALL entries in the object
                        // (table array + nested objects + regular fields)
                        if (hasTableArray && tableArrayKey && tableArrayData) {
                          if (!sectionsMap[sectionKey]) {
                            sectionsMap[sectionKey] = {
                              title: formattedSectionName,
                              icon: getSectionIcon(sectionName),
                              fields: [],
                              subsections: []
                            };
                          }
                          const section = sectionsMap[sectionKey];

                          // Process the table array
                          const firstItem = tableArrayData[0];

                          // Search for column order metadata in sectionData first, then top-level data
                          let columnOrder = findColumnOrder(parsedValue, sectionKey, tableArrayKey);
                          if (!columnOrder || columnOrder.length === 0) {
                            const topLevelOrder = findColumnOrder(data, sectionKey, tableArrayKey);
                            if (topLevelOrder) {
                              columnOrder = topLevelOrder;
                            }
                          }

                          // Build ordered columns list: use metadata order if available, otherwise use object keys order
                          let orderedColumns: string[];
                          if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                            // Use metadata order, filter to only include columns that exist
                            orderedColumns = columnOrder.filter((col: string) => col in firstItem);
                            // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                            const orderedSet = new Set(orderedColumns);
                            Object.keys(firstItem).forEach(col => {
                              if (!orderedSet.has(col)) {
                                orderedColumns.push(col);
                              }
                            });
                          } else {
                            // No metadata - use object keys order (preserves insertion order)
                            orderedColumns = Object.keys(firstItem);
                          }

                          const finalOrderedColumns = orderedColumns;

                          // Check for nested objects in table rows (for grouped headers)
                          const hasNestedObjects = Object.values(firstItem).some(val =>
                            typeof val === 'object' && val !== null && !Array.isArray(val)
                          );

                          let tableHeaders: string[];
                          let groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> | undefined;
                          let flatTableData: any[];

                          if (hasNestedObjects) {
                            // Create grouped headers structure
                            const flatHeaders: string[] = [];
                            groupedHeaders = [];

                            // Build structure from first item - use ordered columns to preserve order
                            finalOrderedColumns.forEach((key) => {
                              const value = firstItem[key];
                              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                // Nested object - create grouped header
                                const subKeys = Object.keys(value);
                                if (subKeys.length > 0) {
                                  groupedHeaders.push({
                                    name: key,
                                    colspan: subKeys.length,
                                    subHeaders: subKeys
                                  });
                                  // Add flat headers for sub-keys in order
                                  subKeys.forEach(subKey => {
                                    flatHeaders.push(`${key}_${subKey}`);
                                  });
                                }
                              } else {
                                // Regular field
                                flatHeaders.push(key);
                                groupedHeaders.push({
                                  name: key,
                                  colspan: 1,
                                  subHeaders: []
                                });
                              }
                            });

                            tableHeaders = flatHeaders;

                            // Flatten all rows based on the structure
                            flatTableData = tableArrayData.map((item: any, index: number) => {
                              const flatRow: any = { _rowIndex: index + 1 };

                              finalOrderedColumns.forEach((key) => {
                                const value = item[key];
                                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                  // Nested object - flatten it
                                  const subKeys = Object.keys(value);
                                  subKeys.forEach(subKey => {
                                    flatRow[`${key}_${subKey}`] = (value as any)[subKey];
                                  });
                                } else {
                                  // Regular field
                                  flatRow[key] = value;
                                }
                              });

                              return flatRow;
                            });
                          } else {
                            // Regular table without nested objects
                            tableHeaders = finalOrderedColumns;
                            flatTableData = tableArrayData.map((item, index) => {
                              const orderedRow: any = { _rowIndex: index + 1 };
                              finalOrderedColumns.forEach(header => {
                                orderedRow[header] = item[header];
                              });
                              return orderedRow;
                            });
                          }

                          section.isTable = true;
                          section.isGroupedTable = hasNestedObjects;
                          section.tableHeaders = tableHeaders;
                          section.tableData = flatTableData;
                          section.groupedHeaders = groupedHeaders;

                          // Now process OTHER entries in the object (nested objects and regular fields)
                          objectEntries.forEach(([key, value]) => {
                            if (isSectionTitleKey(key)) return;
                            if (key === tableArrayKey) return; // Skip the table array we already processed
                            // Skip metadata keys (they're not fields)
                            if (key.startsWith('_')) return;

                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                              // Nested object - create subsection
                              const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
                              Object.entries(value).forEach(([subKey, subValue]) => {
                                if (isSectionTitleKey(subKey)) return;
                                subsectionFields.push({
                                  name: formatFieldName(subKey),
                                  originalName: subKey,
                                  value: subValue
                                });
                              });

                              section.subsections = section.subsections || [];
                              section.subsections.push({
                                title: formatFieldName(key),
                                fields: subsectionFields
                              });
                            } else {
                              // Regular field
                              section.fields.push({
                                name: formatFieldName(key),
                                originalName: key,
                                value: value
                              });
                            }
                          });

                          return; // Skip further processing
                        }

                        // NEW: Check if this is a nested object table structure
                        // Pattern: object where all values are objects with the same keys (each key = row, each value = row data)
                        const nestedObjectEntries = Object.entries(parsedValue);
                        if (nestedObjectEntries.length > 0) {
                          const allValuesAreObjects = nestedObjectEntries.every(([_, value]) =>
                            typeof value === 'object' && value !== null && !Array.isArray(value)
                          );

                          if (allValuesAreObjects && nestedObjectEntries.length >= 2) {
                            // Check if all nested objects have the same keys (uniform structure)
                            const firstNestedObject = nestedObjectEntries[0][1] as Record<string, any>;
                            const firstNestedKeys = Object.keys(firstNestedObject).sort();
                            const hasUniformNestedStructure = nestedObjectEntries.every(([_, value]) => {
                              const nestedObj = value as Record<string, any>;
                              return Object.keys(nestedObj).sort().join(',') === firstNestedKeys.join(',');
                            });

                            // If uniform structure and has 2+ columns, render as table
                            if (hasUniformNestedStructure && firstNestedKeys.length >= 2) {
                              // Convert nested object to array of objects (table format)
                              const tableRows = nestedObjectEntries.map(([rowKey, rowData]) => {
                                const rowDataObj = rowData as Record<string, any>;
                                // Include row key as first column if it's meaningful (not just "row1", "row2")
                                const isMeaningfulRowKey = !/^(row|item|entry|record)[_\s]?\d+$/i.test(rowKey);
                                if (isMeaningfulRowKey) {
                                  return {
                                    _rowKey: rowKey,
                                    ...rowDataObj
                                  };
                                }
                                return rowDataObj;
                              });

                              if (!sectionsMap[sectionKey]) {
                                sectionsMap[sectionKey] = {
                                  title: formattedSectionName,
                                  icon: getSectionIcon(sectionName),
                                  fields: [],
                                  subsections: []
                                };
                              }
                              const section = sectionsMap[sectionKey];
                              section.isTable = true;
                              section.tableData = tableRows;
                              section.tableHeaders = tableRows[0]?._rowKey
                                ? ['_rowKey', ...firstNestedKeys]
                                : firstNestedKeys;
                              return; // Skip further processing
                            }
                          }
                        }

                        // It's a JSON object - create section (no merging)
                        if (!sectionsMap[sectionKey]) {
                          sectionsMap[sectionKey] = {
                            title: formattedSectionName,
                            icon: getSectionIcon(sectionName),
                            fields: [],
                            subsections: []
                          };
                        }

                        const section = sectionsMap[sectionKey];

                        Object.entries(parsedValue).forEach(([key, value]) => {
                          if (isSectionTitleKey(key)) return;
                          // Skip metadata keys (they're not fields)
                          if (key.startsWith('_')) return;
                          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            // Nested object - create subsection
                            const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
                            Object.entries(value).forEach(([subKey, subValue]) => {
                              if (isSectionTitleKey(subKey)) return;
                              // Skip metadata keys (they're not fields)
                              if (subKey.startsWith('_')) return;
                              subsectionFields.push({
                                name: formatFieldName(subKey),
                                originalName: subKey, // Preserve original field name for editing
                                value: subValue
                              });
                            });

                            // Create subsection (no merging - each occurrence is separate)
                            section.subsections = section.subsections || [];
                            section.subsections.push({
                              title: formatFieldName(key),
                              fields: subsectionFields
                            });
                          } else {
                            // Regular field
                            section.fields.push({
                              name: formatFieldName(key),
                              originalName: key, // Preserve original field name for editing
                              value: value
                            });
                          }
                        });
                      } else if (Array.isArray(parsedValue)) {
                        // Array value - create section and expand (no merging)
                        if (!sectionsMap[sectionKey]) {
                          sectionsMap[sectionKey] = {
                            title: formattedSectionName, // Display without page suffix
                            icon: getSectionIcon(sectionName),
                            fields: [],
                            subsections: []
                          };
                        }
                        const section = sectionsMap[sectionKey];

                        if (parsedValue.every(item => typeof item === 'object' && item !== null)) {
                          // Check if this is signature data first (prioritize over table detection)
                          const isSignatureData = parsedValue.every(item =>
                            item && typeof item === 'object' && 'image_base64' in item
                          );

                          if (isSignatureData) {
                            // Render as signature images (simple label + image)
                            section.isSignature = true;
                            section.signatureData = parsedValue;
                          } else {
                            // Universal: table when array of objects with same keys
                            const isTabularData = arrayOfObjectsWithSameKeys(parsedValue);

                            // Pure structure-based detection: render as table if:
                            // 1. Array has uniform structure (all objects have same keys)
                            // 2. Has 2+ columns (strong indicator of tabular data)
                            if (isTabularData) {
                              const firstItem = parsedValue[0];
                              const columnCount = Object.keys(firstItem).length;
                              const hasMultipleColumns = columnCount >= 2;

                              if (hasMultipleColumns) {
                                // Check for nested objects in table rows (for grouped headers)
                                const hasNestedObjects = Object.values(firstItem).some(val =>
                                  typeof val === 'object' && val !== null && !Array.isArray(val)
                                );

                                if (hasNestedObjects) {
                                  // Detect nested objects and create grouped headers
                                  // For top-level arrays, search in top-level data (metadata is at root level)
                                  // Use hierarchicalData directly (it's the source of truth for metadata)
                                  let columnOrder = findColumnOrder(hierarchicalData, sectionKey);

                                  // Debug: Log the lookup attempt
                                  console.log('🔍 Column order lookup:', {
                                    sectionKey,
                                    foundInHierarchicalData: !!columnOrder,
                                    columnOrder: columnOrder || 'not found',
                                    metadataKeys: Object.keys(hierarchicalData).filter(k => k.includes('columnOrder'))
                                  });

                                  if (!columnOrder || columnOrder.length === 0) {
                                    // Also try searching in parsedValue (in case metadata is nested)
                                    const nestedOrder = findColumnOrder(parsedValue, sectionKey);
                                    if (nestedOrder) {
                                      columnOrder = nestedOrder;
                                    }
                                  }

                                  // Build ordered columns list: use metadata order if available, otherwise use object keys order
                                  let orderedColumns: string[];
                                  if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                                    // Use metadata order, filter to only include columns that exist
                                    orderedColumns = columnOrder.filter((col: string) => col in firstItem);
                                    // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                                    const orderedSet = new Set(orderedColumns);
                                    Object.keys(firstItem).forEach(col => {
                                      if (!orderedSet.has(col)) {
                                        orderedColumns.push(col);
                                      }
                                    });
                                  } else {
                                    // No metadata - use object keys order (preserves insertion order)
                                    orderedColumns = Object.keys(firstItem);
                                  }

                                  const finalOrderedColumns = orderedColumns;

                                  // Debug: Log the final ordered columns
                                  console.log('✅ Final ordered columns:', finalOrderedColumns);

                                  // Build grouped headers structure from first item
                                  const flatHeaders: string[] = [];
                                  const groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> = [];

                                  // Build structure from first item - use ordered columns to preserve order
                                  finalOrderedColumns.forEach((key) => {
                                    const value = firstItem[key];
                                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                      // Nested object - create grouped header
                                      const subKeys = Object.keys(value);
                                      if (subKeys.length > 0) {
                                        groupedHeaders.push({
                                          name: key,
                                          colspan: subKeys.length,
                                          subHeaders: subKeys
                                        });
                                        // Add flat headers for sub-keys in order
                                        subKeys.forEach(subKey => {
                                          flatHeaders.push(`${key}_${subKey}`);
                                        });
                                      }
                                    } else {
                                      // Regular field
                                      flatHeaders.push(key);
                                      groupedHeaders.push({
                                        name: key,
                                        colspan: 1,
                                        subHeaders: []
                                      });
                                    }
                                  });

                                  // Flatten all rows based on the structure
                                  const flatTableData = parsedValue.map((item: any) => {
                                    const flatRow: any = {};

                                    finalOrderedColumns.forEach((key) => {
                                      const value = item[key];
                                      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                        // Nested object - flatten it
                                        const subKeys = Object.keys(value);
                                        subKeys.forEach(subKey => {
                                          flatRow[`${key}_${subKey}`] = (value as any)[subKey];
                                        });
                                      } else {
                                        // Regular field
                                        flatRow[key] = value;
                                      }
                                    });

                                    return flatRow;
                                  });

                                  // Render as grouped table
                                  section.isTable = true;
                                  section.isGroupedTable = true;
                                  section.tableData = flatTableData;
                                  section.tableHeaders = flatHeaders;
                                  section.groupedHeaders = groupedHeaders;
                                } else {
                                  // Regular table without nested objects
                                  // For top-level arrays, search in top-level data (metadata is at root level)
                                  // Use hierarchicalData directly (it's the source of truth for metadata)
                                  let columnOrder = findColumnOrder(hierarchicalData, sectionKey);

                                  // Debug: Log the lookup attempt
                                  console.log('🔍 Column order lookup (regular table):', {
                                    sectionKey,
                                    foundInHierarchicalData: !!columnOrder,
                                    columnOrder: columnOrder || 'not found',
                                    metadataKeys: Object.keys(hierarchicalData).filter(k => k.includes('columnOrder'))
                                  });

                                  if (!columnOrder || columnOrder.length === 0) {
                                    // Also try searching in parsedValue (in case metadata is nested)
                                    const nestedOrder = findColumnOrder(parsedValue, sectionKey);
                                    if (nestedOrder) {
                                      columnOrder = nestedOrder;
                                    }
                                  }

                                  // Build ordered headers list: use metadata order if available, otherwise use object keys order
                                  let tableHeaders: string[];
                                  if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                                    // Use metadata order, filter to only include columns that exist
                                    tableHeaders = columnOrder.filter((col: string) => col in firstItem);
                                    // Add any missing columns from firstItem at the end (preserve metadata order for existing columns)
                                    const orderedSet = new Set(tableHeaders);
                                    Object.keys(firstItem).forEach(col => {
                                      if (!orderedSet.has(col)) {
                                        tableHeaders.push(col);
                                      }
                                    });
                                  } else {
                                    // No metadata - use object keys order (preserves insertion order)
                                    tableHeaders = Object.keys(firstItem);
                                  }

                                  const finalTableHeaders = tableHeaders;

                                  // Debug: Log the final ordered headers
                                  console.log('✅ Final ordered headers:', finalTableHeaders);

                                  // Render as table - pure structure-based decision
                                  section.isTable = true;
                                  section.tableData = parsedValue;
                                  section.tableHeaders = finalTableHeaders;
                                }
                              } else {
                                // Array of objects with < 3 columns -> each item becomes a numbered subsection
                                parsedValue.forEach((item, idx) => {
                                  const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
                                  Object.entries(item as Record<string, any>).forEach(([k, v]) => {
                                    if (isSectionTitleKey(k)) return;
                                    // Skip metadata keys (they're not fields)
                                    if (k.startsWith('_')) return;
                                    subsectionFields.push({
                                      name: formatFieldName(k),
                                      originalName: k, // Preserve original field name for editing
                                      value: v
                                    });
                                  });
                                  section.subsections?.push({
                                    title: `Item ${idx + 1}`,
                                    fields: subsectionFields
                                  });
                                });
                              }
                            } else {
                              // Array of objects with different structures -> each item becomes a numbered subsection
                              parsedValue.forEach((item, idx) => {
                                const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
                                Object.entries(item as Record<string, any>).forEach(([k, v]) => {
                                  if (isSectionTitleKey(k)) return;
                                  subsectionFields.push({
                                    name: formatFieldName(k),
                                    originalName: k, // Preserve original field name for editing
                                    value: v
                                  });
                                });
                                section.subsections?.push({
                                  title: `Item ${idx + 1}`,
                                  fields: subsectionFields
                                });
                              });
                            }
                          }
                        } else {
                          // Simple array -> render exactly as backend sends
                          section.fields.push({
                            name: formatFieldName(sectionName),
                            originalName: sectionName, // Preserve original field name for editing
                            value: parsedValue
                          });
                        }
                      } else {
                        // Only consider plain objects for single-row table rendering
                        if (isPlainObject(parsedValue)) {
                          // Flat object (single record) with multiple primitive fields -> render as single-row table
                          const entries = Object.entries(parsedValue as Record<string, any>);
                          const allPrimitive = entries.every(([_, v]) => isPrimitive(v));
                          const hasEnoughColumns = entries.length >= 3; // heuristic for table-like

                          if (allPrimitive && hasEnoughColumns) {
                            if (!sectionsMap[sectionKey]) {
                              sectionsMap[sectionKey] = {
                                title: formattedSectionName, // Display without page suffix
                                icon: getSectionIcon(sectionName),
                                fields: [],
                                subsections: []
                              };
                            }
                            const section = sectionsMap[sectionKey];
                            section.isTable = true;
                            section.tableHeaders = entries.map(([k]) => k);
                            section.tableData = [Object.fromEntries(entries)];
                            return;
                          }
                        }

                        // Simple value (including strings) -> create a section named after the field
                        // Each field without a section becomes its own section (no merging)
                        if (!sectionsMap[sectionKey]) {
                          sectionsMap[sectionKey] = {
                            title: formattedSectionName, // Display without page suffix
                            icon: getSectionIcon(sectionName),
                            fields: []
                          };
                        }

                        sectionsMap[sectionKey].fields.push({
                          name: formatFieldName(sectionName),
                          originalName: sectionName, // Preserve original field name for editing
                          value: parsedValue
                        });
                      }
                    });

                    // Convert map to array while preserving order from original data
                    // Use order from hierarchicalData if available, otherwise use insertion order
                    let sections: any[];
                    if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
                      // Get order from _keyOrder metadata if available (preserves LLM/page order)
                      let orderedKeys = hierarchicalData._keyOrder;
                      if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
                        // Fallback: use insertion order from Object.keys (should preserve order from backend)
                        orderedKeys = Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
                        console.log('⚠️ No _keyOrder found in hierarchicalData, using Object.keys() order');
                      } else {
                        console.log('✅ Using _keyOrder for section sequence:', orderedKeys.slice(0, 5));
                      }

                      // Map keys to sections in the correct order
                      // Use original keys (with page suffixes) to access sectionsMap - no merging, each is separate
                      sections = orderedKeys
                        .filter(key => hierarchicalData.hasOwnProperty(key)) // Ensure key exists
                        .map(key => sectionsMap[key]) // Use original key (with page suffix) - no formatting
                        .filter(section => section !== undefined); // Remove undefined sections

                      // Add any sections not in orderedKeys (shouldn't happen, but safety check)
                      const orderedKeysSet = new Set(orderedKeys);
                      Object.entries(sectionsMap).forEach(([key, section]) => {
                        if (!orderedKeysSet.has(key)) {
                          sections.push(section);
                          console.warn('⚠️ Section not in _keyOrder:', key);
                        }
                      });

                      console.log(`✅ Rendered ${sections.length} sections in order`);
                    } else {
                      // Fallback: use insertion order (JavaScript objects preserve insertion order)
                      sections = Object.values(sectionsMap);
                      console.log('⚠️ hierarchicalData is not an object, using sectionsMap order');
                    }

                    // Helper function to format cell values (for table cells)
                    const formatCellValue = (value: any): string => {
                      if (value === null || value === undefined) {
                        return 'Not specified';
                      }

                      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        return String(value);
                      }

                      if (typeof value === 'object') {
                        if (Array.isArray(value)) {
                          if (value.length === 0) {
                            return 'No data';
                          }
                          // For arrays in cells, show a summary
                          return `Array of ${value.length} item${value.length !== 1 ? 's' : ''}`;
                        } else {
                          // Handle nested objects in cells - format as key: value pairs
                          const entries = Object.entries(value);
                          if (entries.length === 0) {
                            return 'Empty object';
                          }
                          // Format as "key1: value1, key2: value2" for compact display
                          return entries.map(([key, val]) => {
                            const formattedKey = formatFieldName(key);
                            const formattedVal = isPrimitive(val) ? String(val) : '...';
                            return `${formattedKey}: ${formattedVal}`;
                          }).join(', ');
                        }
                      }

                      return String(value);
                    };

                    // Helper function to render field values (for non-table fields)
                    const renderFieldValue = (value: any): React.ReactNode => {
                      if (value === null || value === undefined) {
                        return 'Not specified';
                      }

                      if (typeof value === 'string') {
                        return value;
                      }

                      if (typeof value === 'object') {
                        if (Array.isArray(value)) {
                          // Handle arrays
                          if (value.length === 0) {
                            return 'No data';
                          }

                          // If array contains objects, render as structured list
                          if (value.every(item => typeof item === 'object' && item !== null)) {
                            return (
                              <div className="space-y-2">
                                {value.map((item, index) => (
                                  <div key={index} className="border-l-2 border-l-gray-300 pl-3">
                                    <div className="space-y-1">
                                      {Object.entries(item).map(([key, val]) => (
                                        <div key={key} className="text-sm">
                                          <span className="font-medium text-gray-700">{formatFieldName(key)}:</span>{' '}
                                          <span className="text-gray-900">{String(val)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          } else {
                            // Simple array
                            return value.join(', ');
                          }
                        } else {
                          // Handle objects
                          return (
                            <div className="space-y-1">
                              {Object.entries(value).map(([key, val]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium text-gray-700">{formatFieldName(key)}:</span>{' '}
                                  <span className="text-gray-900">{String(val)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                      }

                      return String(value);
                    };

                    return (
                      <div className="space-y-6">
                        {sections.map((section, sectionIndex) => {
                          const sectionKey = section.title.toLowerCase().replace(/\s+/g, '_');
                          return (
                            <Card key={sectionIndex} className="border-l-4 border-l-blue-500">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  {section.icon}
                                  {section.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Render table if this section contains tabular data */}
                                  {section.isTable && section.tableData && section.tableHeaders && (
                                    <div className="overflow-x-auto w-full scrollbar-thin">
                                      <table className="w-full border-collapse border border-gray-300">
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
                                              {section.groupedHeaders.some((h: any) => h.colspan > 1) && (
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
                                                          className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700"
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
                                                <th key={headerIndex} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                                  {formatFieldName(header === '_rowKey' ? 'Row' : header)}
                                                </th>
                                              ))}
                                            </tr>
                                          )}
                                        </thead>
                                        <tbody>
                                          {section.tableData.map((row: any, rowIndex: number) => (
                                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                              {section.tableHeaders.map((header: string, cellIndex: number) => {
                                                const cellValue = row[header];
                                                // Handle _rowKey column specially
                                                if (header === '_rowKey' && row._rowKey) {
                                                  return (
                                                    <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                                      {isEditingData ? (
                                                        <input
                                                          type="text"
                                                          value={getCurrentFieldValue(sectionKey, `_rowKey_${rowIndex}`, row._rowKey)}
                                                          onChange={(e) => handleFieldChange(sectionKey, `_rowKey_${rowIndex}`, e.target.value)}
                                                          className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                          placeholder="Enter row key"
                                                        />
                                                      ) : (
                                                        formatFieldName(row._rowKey)
                                                      )}
                                                    </td>
                                                  );
                                                }
                                                return (
                                                  <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                                    {isEditingData ? (
                                                      <input
                                                        type="text"
                                                        value={getCurrentFieldValue(sectionKey, `${header}_${rowIndex}`, cellValue || 'Not specified')}
                                                        onChange={(e) => handleFieldChange(sectionKey, `${header}_${rowIndex}`, e.target.value)}
                                                        className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                        placeholder={`Enter ${header}`}
                                                      />
                                                    ) : (
                                                      formatCellValue(cellValue)
                                                    )}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Render main section fields */}
                                  {section.fields.length > 0 && (
                                    <div className="space-y-3">
                                      {section.fields.map((field, fieldIndex) => (
                                        <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                                          <div className="md:col-span-1">
                                            <label className="text-sm font-medium text-gray-600 block">
                                              {field.name}
                                            </label>
                                          </div>
                                          <div className="md:col-span-1">
                                            {isEditingData ? (
                                              <input
                                                type="text"
                                                value={getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value)}
                                                onChange={(e) => handleFieldChange(sectionKey, field.originalName || field.name, e.target.value)}
                                                className="w-full text-sm text-gray-900 bg-white p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[2rem]"
                                                placeholder={`Enter ${field.name}`}
                                              />
                                            ) : (
                                              <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2rem]">
                                                {renderFieldValue(getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Render signatures if this section contains signature data */}
                                  {section.isSignature && section.signatureData && (
                                    <div className="space-y-4">
                                      {section.signatureData.map((signature: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                                          <img
                                            src={String(signature.image_base64)}
                                            alt={String(signature.label || `signature ${idx + 1}`)}
                                            className="h-16 w-auto rounded border shadow-sm bg-white"
                                          />
                                          <div className="text-sm font-medium text-gray-700">
                                            {formatFieldName(signature.label || `Signature ${idx + 1}`)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Render subsections */}
                                  {section.subsections && section.subsections.map((subsection, subIndex) => (
                                    <div key={subIndex} className="border-l-2 border-l-gray-200 pl-4">
                                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        {subsection.title}
                                      </h4>
                                      <div className="space-y-3">
                                        {subsection.fields.map((field, fieldIndex) => (
                                          <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                                            <div className="md:col-span-1">
                                              <label className="text-sm font-medium text-gray-600 block">
                                                {field.name}
                                              </label>
                                            </div>
                                            <div className="md:col-span-1">
                                              {isEditingData ? (
                                                <input
                                                  type="text"
                                                  value={getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value)}
                                                  onChange={(e) => handleFieldChange(sectionKey, field.originalName || field.name, e.target.value)}
                                                  className="w-full text-sm text-gray-900 bg-white p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[2rem]"
                                                  placeholder={`Enter ${field.name}`}
                                                />
                                              ) : (
                                                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2rem]">
                                                  {renderFieldValue(getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
};

export default Upload;