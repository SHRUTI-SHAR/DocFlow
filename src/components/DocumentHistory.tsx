import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDocumentProcessingContext } from "@/contexts/DocumentProcessingContext";

interface ProcessedDocument {
  id: string;
  filename: string;
  extractedFields: any[];
  templateUsed?: string;
  confidence: number;
  processedAt: string;
  ocrText?: string;
  supabaseId?: string;
  error?: string;
}

interface ExtractedField {
  id: string;
  name: string;
  type: string;
  value: string;
  confidence: number;
}

export const DocumentHistory: React.FC = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const { toast } = useToast();
  const { refreshTrigger } = useDocumentProcessingContext();

  useEffect(() => {
    fetchDocumentHistory();
  }, [refreshTrigger]); // Refresh when trigger changes

  const fetchDocumentHistory = async () => {
    try {
      // Get from localStorage (primary storage for now)
      const localDocuments = JSON.parse(localStorage.getItem('processed_documents') || '[]');
      
      // Try to get from Supabase as well if authenticated
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: supabaseDocuments, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('processing_status', 'completed')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching from Supabase:', error);
        } else {
          // Merge with localStorage data
          const mergedDocuments = [
            ...localDocuments,
            ...(supabaseDocuments?.map(doc => {
              const metadata = doc.metadata as any || {};
              return {
                id: doc.id,
                filename: doc.file_name,
                extractedFields: metadata.extractedFields || [],
                templateUsed: metadata.templateUsed,
                confidence: metadata.confidence || 0,
                processedAt: doc.created_at,
                ocrText: doc.extracted_text,
                supabaseId: doc.id
              };
            }) || [])
          ];
          
          // Remove duplicates based on supabaseId
          const uniqueDocuments = mergedDocuments.filter((doc, index, self) => 
            doc.supabaseId ? 
              index === self.findIndex(d => d.supabaseId === doc.supabaseId) :
              index === self.findIndex(d => d.id === doc.id && !d.supabaseId)
          );
          
          setDocuments(uniqueDocuments);
          setLoading(false);
          return;
        }
      }

      setDocuments(localDocuments);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load document history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (doc: ProcessedDocument) => {
    if (doc.error) {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    return <CheckCircle className="w-4 h-4 text-success" />;
  };

  const getStatusColor = (doc: ProcessedDocument) => {
    if (doc.error) {
      return 'destructive';
    }
    return 'default';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading document history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Processing History
          </CardTitle>
        </CardHeader>
      </Card>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              No documents processed yet. Upload a document to get started.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Processing History</TabsTrigger>
            {selectedDocument && <TabsTrigger value="extracted">Extracted Data</TabsTrigger>}
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{doc.filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        Processed: {new Date(doc.processedAt).toLocaleString()}
                      </p>
                      {doc.supabaseId && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Saved to Database
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocument(doc)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(doc)}>
                            {doc.error ? 'Failed' : 'Completed'}
                          </Badge>
                          {doc.templateUsed && (
                            <span className="text-sm text-muted-foreground">
                              using {doc.templateUsed}
                            </span>
                          )}
                        </div>
                        {doc.error && (
                          <p className="text-sm text-destructive mt-1">{doc.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{doc.extractedFields?.length || 0} fields</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((doc.confidence || 0) * 100)}% confidence
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {selectedDocument && (
            <TabsContent value="extracted" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Extracted Fields - {selectedDocument.filename}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocument(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedDocument.extractedFields && selectedDocument.extractedFields.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDocument.extractedFields.map((field: ExtractedField, index) => (
                        <div key={field.id || index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{field.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {field.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {Math.round((field.confidence || 0) * 100)}%
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm font-mono bg-background p-2 rounded border">
                            {field.value || 'No value extracted'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No extracted fields available</p>
                  )}
                </CardContent>
              </Card>

              {selectedDocument.ocrText && (
                <Card>
                  <CardHeader>
                    <CardTitle>OCR Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-3 rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-sm font-mono whitespace-pre-wrap">{selectedDocument.ocrText}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
};