import React from 'react';
import { DocumentGrid } from '@/components/document-manager/DocumentGrid';
import { DocumentList } from '@/components/document-manager/DocumentList';
import { SmartFolders } from '@/components/document-manager/SmartFolders';
import { AIRecommendations } from '@/components/document-manager/AIRecommendations';
import { FileText } from 'lucide-react';
import type { Document, ViewMode } from '../types';

interface DocumentsViewProps {
  documents: Document[];
  viewMode: ViewMode;
  aiInsightsEnabled: boolean;
  selectedFolder: string;
  onFolderSelect: (folderId: string) => void;
  onDocumentClick?: (doc: Document) => void;
  onRefresh?: () => void;
}

export function DocumentsView({
  documents,
  viewMode,
  aiInsightsEnabled,
  selectedFolder,
  onFolderSelect,
  onDocumentClick,
  onRefresh,
}: DocumentsViewProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No documents yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Upload your first document to get started with SimplifyDrive
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {aiInsightsEnabled && (
        <aside className="w-full lg:w-80 space-y-4 flex-shrink-0">
          <SmartFolders 
            onFolderSelect={onFolderSelect}
            selectedFolder={selectedFolder}
          />
          <AIRecommendations documents={documents} onRefresh={onRefresh} />
        </aside>
      )}

      <main className="flex-1 min-w-0">
        {viewMode === 'grid' ? (
          <DocumentGrid 
            documents={documents}
            onDocumentClick={(doc) => {
              const fullDoc = documents.find(d => d.id === doc.id);
              if (fullDoc) onDocumentClick?.(fullDoc);
            }}
          />
        ) : (
          <DocumentList 
            documents={documents}
            onDocumentClick={(doc) => {
              const fullDoc = documents.find(d => d.id === doc.id);
              if (fullDoc) onDocumentClick?.(fullDoc);
            }}
          />
        )}
      </main>
    </div>
  );
}
