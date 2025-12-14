import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, Image, Table, Archive, Code, File,
  Calendar, User, Folder, ChevronDown, ArrowUpDown,
  ExternalLink, MoreHorizontal
} from 'lucide-react';
import { SearchResult, SortField, SortDirection, formatFileSize } from '@/types/search';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  totalCount: number;
  executionTimeMs: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onResultClick?: (result: SearchResult) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  highlightTerms?: string[];
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date_modified', label: 'Date Modified' },
  { value: 'date_created', label: 'Date Created' },
  { value: 'title', label: 'Title' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' }
];

const getFileIcon = (fileType?: string) => {
  if (!fileType) return File;
  
  const type = fileType.toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(type)) return FileText;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(type)) return Image;
  if (['xls', 'xlsx', 'csv'].includes(type)) return Table;
  if (['zip', 'rar', '7z', 'tar'].includes(type)) return Archive;
  if (['js', 'ts', 'py', 'java', 'html', 'css'].includes(type)) return Code;
  
  return File;
};

const getFileTypeColor = (fileType?: string) => {
  if (!fileType) return 'text-muted-foreground';
  
  const type = fileType.toLowerCase();
  if (['pdf'].includes(type)) return 'text-red-500';
  if (['doc', 'docx'].includes(type)) return 'text-blue-500';
  if (['xls', 'xlsx', 'csv'].includes(type)) return 'text-green-500';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) return 'text-purple-500';
  if (['zip', 'rar'].includes(type)) return 'text-amber-500';
  
  return 'text-muted-foreground';
};

export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  isLoading,
  totalCount,
  executionTimeMs,
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
  onResultClick,
  onLoadMore,
  hasMore = false,
  highlightTerms = []
}) => {
  const highlightText = (text: string): React.ReactNode => {
    if (!highlightTerms.length || !text) return text;
    
    let result = text;
    highlightTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 ? (
            <>
              <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
              {' '}results found in {executionTimeMs}ms
            </>
          ) : (
            'No results found'
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
            <SelectTrigger className="w-[140px] h-8">
              <ArrowUpDown className="h-3 w-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              sortDirection === 'asc' && "rotate-180"
            )} />
          </Button>
        </div>
      </div>

      {/* Results list */}
      {results.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((result) => {
            const FileIcon = getFileIcon(result.file_type);
            const iconColor = getFileTypeColor(result.file_type);

            return (
              <Card
                key={result.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onResultClick?.(result)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* File icon */}
                    <div className={cn(
                      "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                      "bg-muted"
                    )}>
                      <FileIcon className={cn("h-6 w-6", iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium truncate">
                          {highlightText(result.title)}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {result.file_type && (
                            <Badge variant="outline" className="text-xs uppercase">
                              {result.file_type}
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            title="Relevance score"
                          >
                            {result.relevanceScore}%
                          </Badge>
                        </div>
                      </div>

                      {/* Description/snippet */}
                      {(result.description || result.snippet) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {highlightText(result.description || result.snippet || '')}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {result.updated_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
                          </span>
                        )}
                        
                        {result.file_size && (
                          <span>{formatFileSize(result.file_size)}</span>
                        )}

                        {result.folder_path && (
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {result.folder_path}
                          </span>
                        )}

                        {result.owner_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {result.owner_name}
                          </span>
                        )}

                        {result.tags && result.tags.length > 0 && (
                          <div className="flex gap-1">
                            {result.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                            {result.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs py-0">
                                +{result.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open in new tab or show preview
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
