import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDocumentProcessingContext } from "@/contexts/DocumentProcessingContext";
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Eye,
  Clock,
  CheckCircle2,
  Users,
  MoreVertical,
  Trash2
} from "lucide-react";
import { TemplateEditor } from "@/components/TemplateEditor";
import { UnknownFormHandler } from "@/components/UnknownFormHandler";
import { TemplateFormPreview } from "@/components/template-preview/TemplateFormPreview";
import { useTemplateManager, type Template } from "@/hooks/useTemplateManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { countFieldsFromHierarchicalData } from "@/utils/templateDataOrganizer";

export const Templates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { templates, isLoading, fetchTemplates, fetchTemplateById, createTemplate, updateTemplate, deleteTemplate } = useTemplateManager();
  const { 
    selectedTemplateForPreview, 
    setSelectedTemplateForPreview, 
    isTemplatePreviewOpen, 
    setIsTemplatePreviewOpen,
    selectedTemplateForEdit,
    setSelectedTemplateForEdit,
    isTemplateEditorOpen,
    setIsTemplateEditorOpen,
    templateEditorData,
    setTemplateEditorData,
    isCreatingNewTemplate,
    setIsCreatingNewTemplate,
    newTemplateData,
    setNewTemplateData,
    newTemplateFields,
    setNewTemplateFields,
    newTemplateSections,
    setNewTemplateSections,
    newTemplateDocumentImage,
    setNewTemplateDocumentImage
  } = useDocumentProcessingContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showUnknownHandler, setShowUnknownHandler] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  // Reserved for future analytics (minimal now)
  // Analytics removed for now; reintroduce if needed later

  const [hasFetchedTemplates, setHasFetchedTemplates] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  
  // Load global template preview state when component mounts
  useEffect(() => {
    if (isTemplatePreviewOpen && selectedTemplateForPreview) {
      setPreviewTemplate(selectedTemplateForPreview);
      setShowPreview(true);
    }
  }, [isTemplatePreviewOpen, selectedTemplateForPreview]);
  
  // Load global template editor state when component mounts
  useEffect(() => {
    if (isTemplateEditorOpen && selectedTemplateForEdit) {
      setSelectedTemplate(selectedTemplateForEdit);
      setShowEditor(true);
    }
  }, [isTemplateEditorOpen, selectedTemplateForEdit]);
  
  // Load global template creation state when component mounts
  useEffect(() => {
    if (isCreatingNewTemplate && newTemplateData) {
      // Create a new template object with the saved data
      const newTemplate = {
        id: 'new-template-global',
        name: newTemplateData.name || 'New Template',
        description: newTemplateData.description || '',
        fields: newTemplateFields,
        metadata: newTemplateData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id,
        is_active: true,
        status: 'draft'
      };
      setSelectedTemplate(newTemplate);
      setShowEditor(true);
    }
  }, [isCreatingNewTemplate, newTemplateData, newTemplateFields, user?.id]);
  
  // Check if we're in selection mode
  const isSelectionMode = searchParams.get('mode') === 'select';
  const returnTo = searchParams.get('returnTo') || '/forms/create';

  useEffect(() => {
    if (user && !hasFetchedTemplates) {
      setHasFetchedTemplates(true);
      fetchTemplates({ page, pageSize });
      // loadTemplateAnalytics(); // defer analytics to reduce initial work
    }
  }, [user, hasFetchedTemplates, fetchTemplates, page]);

  // Analytics loader removed

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to access template management features.
          </p>
          <Button variant="hero" onClick={() => { (window as any).location.href = '/auth'; }}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination for filtered templates
  const totalPages = Math.ceil(filteredTemplates.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Adjust page if current page is out of range after filtering
  useEffect(() => {
    const totalPages = Math.ceil(filteredTemplates.length / pageSize);
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [filteredTemplates.length, page, pageSize]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/20";
      case "draft": return "bg-warning/10 text-warning border-warning/20";
      case "archived": return "bg-muted text-muted-foreground border-muted";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const handleEditTemplate = async (template: Template) => {
    // Load full template (fields, metadata) on demand
    const full = await fetchTemplateById(template.id);
    const t = full || template;
    setSelectedTemplate(t as Template);
    setShowEditor(true);
    setSelectedTemplateForEdit(t as Template);
    setIsTemplateEditorOpen(true);
  };

  const handleCreateUnknownTemplate = () => {
    setShowUnknownHandler(true);
  };

  const handleCreateTemplate = () => {
    // Create a new template with a temporary ID
    const newTemplate: Template = {
      id: `new-${Date.now()}`,
      name: 'New Template',
      description: 'A new document template',
      version: '1.0',
      status: 'draft',
      fields: [],
      field_count: 0,
      usage_count: 0,
      accuracy_score: 0,
      is_public: false,
      document_type: 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'Current User',
      user_id: user?.id || ''
    };
    setSelectedTemplate(newTemplate);
    setShowEditor(true);
    // Store in global state for persistence
    setIsCreatingNewTemplate(true);
    setNewTemplateData({
      name: newTemplate.name,
      description: newTemplate.description,
      version: newTemplate.version,
      status: newTemplate.status,
      document_type: newTemplate.document_type,
      metadata: {}
    });
    setNewTemplateFields([]);
    setNewTemplateSections([{ id: 'general', name: 'General', order: 0 }]);
    setNewTemplateDocumentImage(undefined);
  };

  const handlePreviewTemplate = async (template: Template) => {
    const full = await fetchTemplateById(template.id);
    setPreviewTemplate((full || template) as Template);
    setShowPreview(true);
    // Store in global state for persistence
    setSelectedTemplateForPreview((full || template) as Template);
    setIsTemplatePreviewOpen(true);
  };

  const handleSelectTemplate = (template: Template) => {
    navigate(`${returnTo}?template=${template.id}`);
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        await deleteTemplate(template.id);
      } catch (error) {
        // Error is handled in the hook
      }
    }
  };

  if (showEditor && selectedTemplate) {
    const handleTemplateSave = async (templateData: any) => {
      try {
        if (selectedTemplate.id.startsWith('new-') || selectedTemplate.id.startsWith('temp-')) {
          await createTemplate({
            name: templateData.name,
            description: templateData.description,
            document_type: templateData.document_type || 'General',
            fields: templateData.fields,
            version: templateData.version || '1.0',
            status: templateData.status || 'draft',
            is_public: templateData.is_public || false,
            metadata: templateData.metadata || {}
          });
        } else {
          await updateTemplate(selectedTemplate.id, templateData);
          // Refresh templates list to ensure UI shows updated data
          await fetchTemplates();
        }
        setShowEditor(false);
        setSelectedTemplate(null);
        // Clear global state
        setIsTemplateEditorOpen(false);
        setSelectedTemplateForEdit(null);
        setTemplateEditorData(null);
        // Clear template creation state
        setIsCreatingNewTemplate(false);
        setNewTemplateData(null);
        setNewTemplateFields([]);
        setNewTemplateSections([]);
        setNewTemplateDocumentImage(undefined);
        // Clear temporary document data
        delete (window as any).__templateEditorDocumentData;
      } catch (error) {
        console.error('Error saving template:', error);
      }
    };

    return (
      <TemplateEditor 
        template={selectedTemplate}
        onClose={() => {
          setShowEditor(false);
          setSelectedTemplate(null);
          // Clear global state
          setIsTemplateEditorOpen(false);
          setSelectedTemplateForEdit(null);
          setTemplateEditorData(null);
          // Clear template creation state
          setIsCreatingNewTemplate(false);
          setNewTemplateData(null);
          setNewTemplateFields([]);
          setNewTemplateSections([]);
          setNewTemplateDocumentImage(undefined);
          // Clear temporary document data
          delete (window as any).__templateEditorDocumentData;
        }}
        onSave={handleTemplateSave}
        isNew={selectedTemplate.id.startsWith('new-') || selectedTemplate.id.startsWith('temp-')}
        documentData={(window as any).__templateEditorDocumentData || selectedTemplate.sample_document_url || (selectedTemplate.metadata && (selectedTemplate.metadata.document_image || selectedTemplate.metadata.sample_document_url))}
      />
    );
  }

  if (showUnknownHandler) {
    return (
      <UnknownFormHandler 
        onClose={() => setShowUnknownHandler(false)}
        onTemplateCreated={async (templateData) => {
          try {
            await createTemplate({
              name: templateData.name,
              description: templateData.description || 'New template created from unknown document',
              document_type: templateData.documentType || 'Unknown Form',
              fields: templateData.fields || [],
              version: '1.0',
              status: 'draft',
              is_public: false,
              metadata: templateData.metadata || {}
            });
            setShowUnknownHandler(false);
            toast({
              title: "Template created",
              description: `${templateData.name} has been added to your templates`
            });
          } catch (error) {
            console.error('Error creating template:', error);
          }
        }}
        onEditTemplate={(templateData, documentData) => {
          // Convert templateData to proper Template format
          const template: Template = {
            id: templateData.id,
            name: templateData.name,
            description: templateData.description,
            version: templateData.version,
            status: templateData.status,
            fields: templateData.fields,
            field_count: templateData.fields.length,
            usage_count: 0,
            accuracy_score: templateData.accuracy,
            is_public: false,
            document_type: templateData.documentType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: templateData.createdBy,
            user_id: user?.id || ''
          };
          
          setSelectedTemplate(template);
          setShowUnknownHandler(false);
          setShowEditor(true);
          
          // Store document data temporarily for the editor
          (window as any).__templateEditorDocumentData = documentData;
        }}
      />
    );
  }

  if (showPreview && previewTemplate) {
    return (
      <div className="min-h-screen bg-background scrollbar-hide">
        <div className="max-w-4xl mx-auto px-4 py-8 scrollbar-hide">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Template Preview</h1>
              <p className="text-muted-foreground">{previewTemplate.name}</p>
            </div>
            <Button variant="outline" onClick={() => {
              setShowPreview(false);
              setIsTemplatePreviewOpen(false);
              setSelectedTemplateForPreview(null);
            }}>
              Back to Templates
            </Button>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Template Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p className="text-muted-foreground">{previewTemplate.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-muted-foreground">{previewTemplate.description}</p>
                  </div>
                  <div>
                    <span className="font-medium">Document Type:</span>
                    <p className="text-muted-foreground">{previewTemplate.document_type}</p>
                  </div>
                  <div>
                    <span className="font-medium">Version:</span>
                    <p className="text-muted-foreground">v{previewTemplate.version}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge className={getStatusColor(previewTemplate.status)}>
                      {previewTemplate.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Fields Count:</span>
                    <p className="text-muted-foreground">
                      {(() => {
                        const hierarchicalData = previewTemplate.metadata?.template_structure || 
                                                  previewTemplate.metadata?.hierarchical_data;
                        if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
                          return countFieldsFromHierarchicalData(hierarchicalData);
                        }
                        return 0;
                      })()} fields
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Usage Count:</span>
                    <p className="text-muted-foreground">{previewTemplate.usage_count} uses</p>
                  </div>
                  <div>
                    <span className="font-medium">Accuracy:</span>
                    <p className="text-muted-foreground">
                      {previewTemplate.accuracy_score > 0 ? `${Math.round(previewTemplate.accuracy_score)}%` : 'Not tested'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Last Modified:</span>
                    <p className="text-muted-foreground">{new Date(previewTemplate.updated_at).toLocaleDateString()} by {previewTemplate.created_by || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Form Preview</h3>
              <TemplateFormPreview 
                fields={previewTemplate.fields as any} 
                hierarchicalData={
                  previewTemplate.metadata?.hierarchical_data || 
                  previewTemplate.metadata?.template_structure || 
                  null
                }
              />
            </div>

            <div className="mt-6 pt-6 border-t border-border flex gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setIsTemplatePreviewOpen(false);
                  setSelectedTemplateForPreview(null);
                }}
              >
                Back to Templates
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  setShowPreview(false);
                  setIsTemplatePreviewOpen(false);
                  setSelectedTemplateForPreview(null);
                  handleEditTemplate(previewTemplate);
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Template
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isSelectionMode ? 'Select Template' : 'Template Management'}
            </h1>
            <p className="text-muted-foreground">
              {isSelectionMode 
                ? 'Choose a template to create your form with predefined fields'
                : 'Create, edit, and manage document processing templates'
              }
            </p>
          </div>
          <div className="flex gap-3">
            {isSelectionMode ? (
              <Button variant="outline" onClick={() => navigate(returnTo)}>
                Back to Form Creation
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCreateUnknownTemplate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Handle Unknown Form
                </Button>
                <Button variant="hero" onClick={handleCreateTemplate}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-primary">{templates.length}</div>
              <FileText className="h-8 w-8 text-primary/60" />
            </div>
            <div className="text-sm text-muted-foreground">Total Templates</div>
          </Card>
          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-success">
                {templates.filter(t => t.status === 'active').length}
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/60" />
            </div>
            <div className="text-sm text-muted-foreground">Active Templates</div>
          </Card>
          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-info">
                {templates.reduce((acc, t) => acc + (t.usage_count || 0), 0)}
              </div>
              <Users className="h-8 w-8 text-info/60" />
            </div>
            <div className="text-sm text-muted-foreground">Total Usage</div>
          </Card>
          <Card className="p-6 bg-gradient-card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold text-warning">
                {templates.filter(t => t.status === 'draft').length}
              </div>
              <Clock className="h-8 w-8 text-warning/60" />
            </div>
            <div className="text-sm text-muted-foreground">Draft Templates</div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name or document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded mb-4"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-muted rounded"></div>
                  <div className="h-6 w-20 bg-muted rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : paginatedTemplates.length === 0 && filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? `No templates match "${searchTerm}". Try a different search term.`
                : "Create your first template to get started with document processing."
              }
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCreateUnknownTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Handle Unknown Form
              </Button>
              <Button variant="hero" onClick={handleCreateTemplate}>
                <FileText className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTemplates.map((template) => (
              <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getStatusColor(template.status)}>
                    {template.status}
                  </Badge>
                  <Badge variant="outline">
                    v{template.version}
                  </Badge>
                  <Badge variant="secondary">
                    {template.document_type}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fields:</span>
                    <span className="ml-1 font-medium">{template.field_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usage:</span>
                    <span className="ml-1 font-medium">{template.usage_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className="ml-1 font-medium">
                      {template.accuracy_score > 0 ? `${Math.round(template.accuracy_score)}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modified:</span>
                    <span className="ml-1 font-medium">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isSelectionMode ? (
                    <Button 
                      variant="hero" 
                      size="sm" 
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Use Template
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePreviewTemplate(template)}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-center items-center gap-3 mt-8">
            <Button 
              variant="outline" 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1} ({filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''})
            </div>
            <Button 
              variant="outline" 
              disabled={page >= totalPages || totalPages === 0} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
          </>
        )}
      </div>
    </div>
  );
};
export default Templates;
