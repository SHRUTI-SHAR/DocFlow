import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  FileText,
  Sparkles,
  Clock,
  Tag,
  Eye,
  Download,
  ExternalLink,
  X,
  Filter,
  ArrowRight,
  CheckCircle,
  Zap
} from 'lucide-react';
import { AISearchResult, QueryAnalysis, SearchFilters, AISearchResponse } from '@/hooks/useAISearch';
import { DocumentClassificationBadge } from './DocumentClassificationBadge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AISearchResultsProps {
  searchResponse: AISearchResponse | null;
  onClear: () => void;
  onViewDocument?: (doc: AISearchResult) => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const AISearchResults: React.FC<AISearchResultsProps> = ({
  searchResponse,
  onClear,
  onViewDocument
}) => {
  if (!searchResponse) return null;

  const { query, analysis, filters, results, totalFound, summary } = searchResponse;

  const handleView = async (doc: AISearchResult) => {
    if (onViewDocument) {
      onViewDocument(doc);
      return;
    }

    // Default view behavior
    if (doc.storage_path) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`;
      window.open(publicUrl, '_blank');
    }
  };

  const handleDownload = async (doc: AISearchResult) => {
    if (!doc.storage_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name || doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Search Results
                <Badge variant="secondary" className="text-xs">
                  {totalFound} found
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {summary}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Query Analysis */}
        <div className="mt-4 flex flex-wrap gap-2">
          {analysis.intent && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {analysis.intent.replace(/_/g, ' ')}
            </Badge>
          )}
          {analysis.documentTypes?.map((type, i) => (
            <Badge key={i} className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {type}
            </Badge>
          ))}
          {analysis.timePeriod && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {analysis.timePeriod}
            </Badge>
          )}
          {analysis.keywords?.slice(0, 3).map((keyword, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {keyword}
            </Badge>
          ))}
          {analysis.confidence && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              {Math.round(analysis.confidence * 100)}% confidence
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No documents found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search query or filters
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-3">
              {results.map((doc, index) => (
                <div
                  key={doc.id}
                  className={cn(
                    "group p-4 rounded-xl border transition-all hover:shadow-md hover:border-primary/30",
                    index === 0 && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Relevance Score */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                        doc.relevanceScore >= 80 ? "bg-green-500/10 text-green-600" :
                        doc.relevanceScore >= 50 ? "bg-amber-500/10 text-amber-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {doc.relevanceScore}
                      </div>
                      <span className="text-[10px] text-muted-foreground">match</span>
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium truncate">
                            {doc.original_name || doc.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(doc.created_at)}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.document_type && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{doc.document_type}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Classification Badge */}
                      {doc.metadata?.classification && (
                        <div className="mt-2">
                          <DocumentClassificationBadge
                            category={doc.metadata.classification.category}
                            categoryName={doc.metadata.classification.categoryName}
                            confidence={doc.metadata.classification.confidence}
                            tags={doc.metadata.classification.tags}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Match Reasons */}
                      {doc.matchReasons && doc.matchReasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.matchReasons.slice(0, 3).map((reason, i) => (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="text-[10px] bg-background"
                            >
                              <Sparkles className="h-2 w-2 mr-1" />
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Matched Keywords */}
                      {doc.matchedKeywords && doc.matchedKeywords.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Matched:</span>
                          {doc.matchedKeywords.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Result Indicator */}
                  {index === 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/10">
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Sparkles className="h-3 w-3" />
                        <span className="font-medium">Best Match</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
