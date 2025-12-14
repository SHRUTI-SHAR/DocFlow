import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Filter, CheckCircle } from 'lucide-react';
import { useTemplateManager } from '@/hooks/useTemplateManager';
import type { TemplateMatch } from '@/types/document';

interface ManualTemplateSelectorProps {
  onTemplateSelected: (template: TemplateMatch) => void;
  onCancel: () => void;
}

export const ManualTemplateSelector: React.FC<ManualTemplateSelectorProps> = ({
  onTemplateSelected,
  onCancel
}) => {
  const { templates, isLoading, fetchTemplates } = useTemplateManager();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Convert and filter templates
  const filteredTemplates = templates
    .map(template => ({
      id: template.id,
      name: template.name,
      confidence: 0,
      version: template.version,
      documentType: template.document_type,
      matchedFields: 0,
      totalFields: template.field_count || (template.fields?.length || 0)
    }))
    .filter(template => {
      const matchesSearch = !searchQuery.trim() || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.documentType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || template.documentType === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const documentTypes = ['all', ...Array.from(new Set(templates.map(t => t.document_type)))];

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      invoice: 'bg-blue-100 text-blue-800',
      contract: 'bg-green-100 text-green-800',
      receipt: 'bg-purple-100 text-purple-800',
      application: 'bg-orange-100 text-orange-800',
      tax: 'bg-red-100 text-red-800',
      insurance: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Manual Template Selection</h3>
        <p className="text-muted-foreground">
          Browse and select a template that best matches your document
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
              onClick={() => onTemplateSelected(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-1">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={getDocumentTypeColor(template.documentType)}
                      >
                        {template.documentType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        v{template.version}
                      </Badge>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    Manual
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.totalFields} fields</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              {templates.length === 0 
                ? "No templates available in database" 
                : "No templates found matching your criteria"
              }
            </p>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Templates will appear here once they are created and saved to the database.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="secondary"
          onClick={() => {
            if (filteredTemplates.length > 0) {
              onTemplateSelected(filteredTemplates[0]);
            }
          }}
          disabled={filteredTemplates.length === 0 || isLoading}
        >
          Use First Template
        </Button>
      </div>
    </div>
  );
};