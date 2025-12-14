import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Copy, Check, Search, BookOpen, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { bulkDocumentsApi } from '@/services/bulkProcessingApi';

interface TranscriptViewerProps {
  jobId: string;
  documentId: string;
  documentName?: string;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  jobId,
  documentId,
  documentName
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('full');

  useEffect(() => {
    loadTranscript();
  }, [jobId, documentId]);

  const loadTranscript = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await bulkDocumentsApi.getDocumentTranscript(jobId, documentId);
      setTranscript(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
      console.error('Transcript load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!transcript?.full_transcript) return;
    
    try {
      await navigator.clipboard.writeText(transcript.full_transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-700">{part}</mark>
      ) : part
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading transcript...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadTranscript} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transcript) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Extraction Transcript</CardTitle>
            <Badge variant="secondary">
              {transcript.total_pages} pages • {transcript.total_sections} sections
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Full Transcript
                </>
              )}
            </Button>
          </div>
        </div>
        {documentName && (
          <p className="text-sm text-muted-foreground mt-1">{documentName}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  What is the transcript?
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  This is the exact text that the AI sees when extracting data from your PDF. 
                  It includes page numbers, section names, field names, and values in a structured format.
                  Template mapping searches this text to find matching fields.
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-2">
                  Generated in {transcript.generation_time_ms}ms • {Object.keys(transcript.field_locations || {}).length} fields indexed
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="full">Full Transcript</TabsTrigger>
              <TabsTrigger value="pages">By Page ({transcript.page_transcripts?.length || 0})</TabsTrigger>
              <TabsTrigger value="fields">Field Locations ({Object.keys(transcript.field_locations || {}).length})</TabsTrigger>
            </TabsList>

            {/* Full Transcript */}
            <TabsContent value="full" className="mt-4">
              <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {highlightSearchTerm(transcript.full_transcript)}
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* By Page */}
            <TabsContent value="pages" className="mt-4">
              <ScrollArea className="h-[600px] w-full rounded-md border">
                <div className="p-4 space-y-6">
                  {transcript.page_transcripts?.map((pageData: any, idx: number) => (
                    <div key={idx} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-2">
                        <Badge variant="outline">Page {pageData.page}</Badge>
                      </div>
                      <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
                        {highlightSearchTerm(pageData.transcript)}
                      </pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Field Locations */}
            <TabsContent value="fields" className="mt-4">
              <ScrollArea className="h-[600px] w-full rounded-md border">
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(transcript.field_locations || {}).map(([fieldName, location]: [string, any]) => (
                      <div 
                        key={fieldName} 
                        className="border rounded-lg p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium font-mono text-sm">{fieldName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Page {location.page}
                              </span>
                              {location.section && (
                                <span className="text-xs">
                                  Section: {location.section}
                                </span>
                              )}
                            </div>
                            {location.context && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                Context: {location.context}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};
