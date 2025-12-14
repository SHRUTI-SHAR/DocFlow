import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  FileCode, 
  File,
  Loader2,
  ArrowUp,
  MoreHorizontal,
  Star,
  Download,
  Eye,
} from 'lucide-react';
import { useCursorPagination } from '@/hooks/useCursorPagination';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { formatDistanceToNow } from 'date-fns';

interface Document {
  id: string;
  name?: string;
  original_name?: string;
  file_path?: string;
  document_type?: string;
  mime_type?: string;
  file_size?: number;
  created_at: string;
  updated_at?: string;
  storage_path?: string;
}

interface InfiniteDocumentListProps {
  onDocumentClick?: (doc: Document) => void;
  onDocumentAction?: (action: string, doc: Document) => void;
  pageSize?: number;
  viewMode?: 'grid' | 'list';
}

export function InfiniteDocumentList({
  onDocumentClick,
  onDocumentAction,
  pageSize = 50,
  viewMode = 'list',
}: InfiniteDocumentListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const {
    items: documents,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadInitial,
    loadMore,
    refresh,
  } = useCursorPagination<Document>('documents', 'uploaded_by', { pageSize });

  // Setup infinite scroll
  const { loadMoreRef } = useInfiniteScroll(loadMore, hasMore, loadingMore);

  // Initial load
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Track scroll position for "back to top" button
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 500);
  }, []);

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getFileIcon = (doc: Document) => {
    const type = doc.document_type || doc.mime_type || '';
    if (type.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes('code') || type.includes('json')) return <FileCode className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayName = (doc: Document) => {
    return doc.original_name || doc.name || doc.file_path?.split('/').pop() || 'Unnamed';
  };

  if (loading && documents.length === 0) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto relative"
      onScroll={handleScroll}
    >
      {/* Header with count */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{totalCount.toLocaleString()} documents</Badge>
          {documents.length < totalCount && (
            <span className="text-xs text-muted-foreground">
              Showing {documents.length.toLocaleString()}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </div>

      {/* Document list */}
      {viewMode === 'list' ? (
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors group"
              onClick={() => onDocumentClick?.(doc)}
            >
              <div className="flex-shrink-0">
                {getFileIcon(doc)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{getDisplayName(doc)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentAction?.('view', doc);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentAction?.('download', doc);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentAction?.('favorite', doc);
                  }}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onDocumentClick?.(doc)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-lg bg-muted mb-3">
                    {getFileIcon(doc)}
                  </div>
                  <p className="font-medium text-sm truncate w-full">{getDisplayName(doc)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(doc.file_size)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load more trigger (infinite scroll sentinel) */}
      <div 
        ref={loadMoreRef} 
        className="h-20 flex items-center justify-center"
      >
        {loadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && documents.length > 0 && (
          <p className="text-sm text-muted-foreground">
            All documents loaded
          </p>
        )}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-50"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}

      {/* Empty state */}
      {documents.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground">Upload your first document to get started</p>
        </div>
      )}
    </div>
  );
}
