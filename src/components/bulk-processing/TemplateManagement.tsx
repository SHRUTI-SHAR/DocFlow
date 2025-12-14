/**
 * Template Management Component
 * 
 * Features:
 * - View all templates
 * - Create new template by uploading Excel with column definitions
 * - Edit existing templates
 * - Delete templates
 * - Upload Excel format: Column Name | Source Field | Post-Process Type | Post-Process Config | Default Value
 */

import React, { useState, useEffect } from 'react';
import { Plus, Upload, Edit, Trash2, Eye, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

// Get bulk API URL with validation
const getBulkApiUrl = (): string => {
  const url = import.meta.env.VITE_BULK_API_URL;
  if (!url) throw new Error('VITE_BULK_API_URL is required');
  return url;
};

interface TemplateColumn {
  excel_column: string;
  source_field: string;
  extraction_hint?: string;
  search_keywords?: string;
  post_process_type?: string;
  post_process_config?: Record<string, any>;
  default_value?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  document_type?: string;
  created_at: string;
  updated_at: string;
  column_count?: number;
}

interface TemplateDetails extends Template {
  columns: TemplateColumn[];
}

const POST_PROCESS_TYPES = [
  'none',
  'yes_no',
  'split_first',
  'split_second',
  'date_format',
  'calculate_years',
  'remove_chars',
  'currency_format',
  'uppercase',
  'lowercase',
  'trim'
];

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    document_type: '',
    columns: [] as TemplateColumn[]
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const apiUrl = getBulkApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/mapping-templates`);
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateDetails = async (templateId: string) => {
    setIsLoading(true);
    try {
      const apiUrl = getBulkApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/mapping-templates/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template details');
      const data = await response.json();
      setSelectedTemplate(data);
      return data;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template details',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Expected columns: Column Name, Source Field, Extraction Hint, Search Keywords, Post-Process Type, Post-Process Config, Default Value
        const columns: TemplateColumn[] = jsonData.map((row) => ({
          excel_column: row['Column Name'] || row['column_name'] || '',
          source_field: row['Source Field'] || row['source_field'] || '',
          extraction_hint: row['Extraction Hint'] || row['extraction_hint'] || undefined,
          search_keywords: row['Search Keywords'] || row['search_keywords'] || undefined,
          post_process_type: row['Post-Process Type'] || row['post_process_type'] || undefined,
          post_process_config: row['Post-Process Config'] 
            ? (typeof row['Post-Process Config'] === 'string' 
                ? JSON.parse(row['Post-Process Config']) 
                : row['Post-Process Config'])
            : undefined,
          default_value: row['Default Value'] || row['default_value'] || undefined
        })).filter(col => col.excel_column); // Filter out empty rows

        setFormData(prev => ({
          ...prev,
          columns
        }));

        toast({
          title: 'Excel Uploaded',
          description: `Loaded ${columns.length} column definitions`
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to parse Excel file. Please check the format.',
          variant: 'destructive'
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        'Column Name': 'Example Column',
        'Source Field': 'tinjauan_perusahaan.nama_debitur',
        'Extraction Hint': 'Extract company name from company overview section',
        'Search Keywords': 'nama,company,perusahaan',
        'Post-Process Type': 'none',
        'Post-Process Config': '{}',
        'Default Value': ''
      },
      {
        'Column Name': 'Customer Since',
        'Source Field': '1.1. TINJAUAN PERUSAHAAN.Debitur BNI sejak',
        'Extraction Hint': 'Find the date when customer became BNI client',
        'Search Keywords': 'debitur,customer since,sejak,tanggal',
        'Post-Process Type': 'date_format',
        'Post-Process Config': '{"input_format": "DD/MM/YYYY", "output_format": "DD/MM/YYYY"}',
        'Default Value': ''
      },
      {
        'Column Name': 'Active Status',
        'Source Field': 'status.active',
        'Extraction Hint': 'Extract active/inactive status',
        'Search Keywords': 'status,aktif,active',
        'Post-Process Type': 'yes_no',
        'Post-Process Config': '{"true_keywords": ["Yes", "Active", "Y", "Aktif"], "false_keywords": ["No", "Inactive", "N", "Tidak Aktif"]}',
        'Default Value': 'N'
      },
      {
        'Column Name': 'NPWP',
        'Source Field': 'tinjauan_perusahaan.npwp',
        'Extraction Hint': 'Extract tax ID number (NPWP)',
        'Search Keywords': 'npwp,tax,pajak,nomor pokok',
        'Post-Process Type': 'remove_chars',
        'Post-Process Config': '{"chars": [".", "-", " "]}',
        'Default Value': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Columns');
    XLSX.writeFile(wb, 'template_definition.xlsx');
  };

  const handleCreateTemplate = async () => {
    if (!formData.name || formData.columns.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a template name and upload column definitions',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = getBulkApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/mapping-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          document_type: formData.document_type,
          columns: formData.columns
        })
      });

      if (!response.ok) throw new Error('Failed to create template');

      toast({
        title: 'Success',
        description: 'Template created successfully'
      });

      setShowCreateDialog(false);
      setFormData({ name: '', description: '', document_type: '', columns: [] });
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const apiUrl = getBulkApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/mapping-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          document_type: formData.document_type,
          columns: formData.columns
        })
      });

      if (!response.ok) throw new Error('Failed to update template');

      toast({
        title: 'Success',
        description: 'Template updated successfully'
      });

      setShowEditDialog(false);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const apiUrl = getBulkApiUrl();
      const response = await fetch(`${apiUrl}/api/v1/mapping-templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast({
        title: 'Success',
        description: 'Template deleted successfully'
      });

      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openViewDialog = async (template: Template) => {
    const details = await loadTemplateDetails(template.id);
    if (details) {
      setShowViewDialog(true);
    }
  };

  const openEditDialog = async (template: Template) => {
    const details = await loadTemplateDetails(template.id);
    if (details) {
      setFormData({
        name: details.name,
        description: details.description || '',
        document_type: details.document_type || '',
        columns: details.columns || []
      });
      setShowEditDialog(true);
    }
  };

  const openDeleteDialog = (template: Template) => {
    setSelectedTemplate(template as TemplateDetails);
    setShowDeleteDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage extraction templates for bulk processing
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Templates define how to map extracted fields to Excel columns with post-processing rules.
          <Button variant="link" className="p-0 h-auto ml-2" onClick={downloadExcelTemplate}>
            Download Excel template format
          </Button>
        </AlertDescription>
      </Alert>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates yet. Create your first template to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.document_type || 'General'}</Badge>
                    </TableCell>
                    <TableCell>{template.column_count || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(template.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(template)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Upload an Excel file with column definitions or manually configure the template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., BNI BWP Template"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_type">Document Type</Label>
                <Input
                  id="document_type"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  placeholder="e.g., bni_bwp_v1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Template description..."
                rows={3}
              />
            </div>

            {/* Excel Upload */}
            <div className="space-y-2">
              <Label>Upload Excel Definition</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="flex-1"
                />
                <Button variant="outline" onClick={downloadExcelTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Format
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Excel should have columns: Column Name, Source Field, Extraction Hint, Search Keywords, Post-Process Type, Post-Process Config, Default Value
              </p>
            </div>

            {/* Column Preview */}
            {formData.columns.length > 0 && (
              <div className="space-y-2">
                <Label>Loaded Columns ({formData.columns.length})</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Excel Column</TableHead>
                        <TableHead>Source Field</TableHead>
                        <TableHead>Extraction Hint</TableHead>
                        <TableHead>Post-Process</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.columns.slice(0, 10).map((col, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{col.excel_column}</TableCell>
                          <TableCell className="text-sm">{col.source_field}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{col.extraction_hint || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{col.post_process_type || 'none'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {formData.columns.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      + {formData.columns.length - 10} more columns
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Document Type</Label>
                  <p className="font-medium">{selectedTemplate.document_type || 'General'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Columns</Label>
                  <p className="font-medium">{selectedTemplate.columns?.length || 0}</p>
                </div>
              </div>

              <div>
                <Label>Column Definitions</Label>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Excel Column</TableHead>
                        <TableHead>Source Field</TableHead>
                        <TableHead>Extraction Hint</TableHead>
                        <TableHead>Search Keywords</TableHead>
                        <TableHead>Post-Process</TableHead>
                        <TableHead>Default</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTemplate.columns?.map((col, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{col.excel_column}</TableCell>
                          <TableCell className="text-sm font-mono text-xs">
                            {col.source_field}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{col.extraction_hint || '-'}</TableCell>
                          <TableCell className="text-xs">{col.search_keywords || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{col.post_process_type || 'none'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{col.default_value || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update template configuration</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-document_type">Document Type</Label>
                <Input
                  id="edit-document_type"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Re-upload Excel Definition (Optional)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
              />
            </div>

            {formData.columns.length > 0 && (
              <div className="space-y-2">
                <Label>Current Columns ({formData.columns.length})</Label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Excel Column</TableHead>
                        <TableHead>Source Field</TableHead>
                        <TableHead>Post-Process</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.columns.slice(0, 10).map((col, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{col.excel_column}</TableCell>
                          <TableCell className="text-sm">{col.source_field}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{col.post_process_type || 'none'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {formData.columns.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      + {formData.columns.length - 10} more columns
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
