import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  CreditCard, 
  FileCheck, 
  Receipt, 
  FileSpreadsheet,
  File,
  ChevronDown,
  ChevronUp,
  FolderKanban
} from 'lucide-react';
import { DocumentType } from '@/hooks/useDocumentTypes';

interface Document {
  id: string;
  document_type?: string;
}

interface DocumentTypeFiltersProps {
  documentTypes: DocumentType[];
  selectedType: string;
  onTypeSelect: (type: string) => void;
  documents: Document[];
  loading?: boolean;
}

// Icon mapping for document types
const iconMap: Record<string, React.ElementType> = {
  'FileText': FileText,
  'CreditCard': CreditCard,
  'FileCheck': FileCheck,
  'Receipt': Receipt,
  'FileSpreadsheet': FileSpreadsheet,
  'File': File,
  'FolderKanban': FolderKanban
};

// Get icon component by name
const getIconComponent = (iconName: string): React.ElementType => {
  return iconMap[iconName] || FileText;
};

export const DocumentTypeFilters: React.FC<DocumentTypeFiltersProps> = ({
  documentTypes,
  selectedType,
  onTypeSelect,
  documents,
  loading = false
}) => {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 5;

  // Calculate document count for each type from documents array
  const getTypeCount = (typeName: string): number => {
    return documents.filter(doc => doc.document_type === typeName).length;
  };

  // Get total document count
  const totalDocuments = documents.length;

  // Get visible types based on showAll state
  const visibleTypes = showAll ? documentTypes : documentTypes.slice(0, maxVisible);
  const hasMore = documentTypes.length > maxVisible;

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <FolderKanban className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Document Types</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <FolderKanban className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Document Types</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {documentTypes.length} types
        </Badge>
      </div>

      {/* All Documents Option */}
      <Button
        variant={selectedType === 'all' ? 'default' : 'ghost'}
        className="w-full justify-start gap-2 h-auto py-2"
        onClick={() => onTypeSelect('all')}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">All Documents</span>
        <Badge variant="outline" className="ml-2 text-xs">
          {totalDocuments}
        </Badge>
      </Button>

      {/* Document Type List */}
      {documentTypes.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <p>No document types yet.</p>
          <p className="text-xs mt-1">Types will appear as you upload documents.</p>
        </div>
      ) : (
        <>
          {visibleTypes.map((type) => {
            const IconComponent = getIconComponent(type.icon);
            const count = type.document_count ?? getTypeCount(type.name);
            
            return (
              <Button
                key={type.id}
                variant={selectedType === type.name ? 'default' : 'ghost'}
                className="w-full justify-start gap-2 h-auto py-2"
                onClick={() => onTypeSelect(type.name)}
                style={selectedType !== type.name ? { 
                  borderLeft: `3px solid ${type.color}` 
                } : undefined}
              >
                <IconComponent 
                  className="w-4 h-4 shrink-0" 
                  style={{ color: selectedType === type.name ? 'currentColor' : type.color }}
                />
                <span className="flex-1 text-left truncate">
                  {type.display_name}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {count}
                </Badge>
              </Button>
            );
          })}

          {/* Show More/Less Button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show {documentTypes.length - maxVisible} More
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
