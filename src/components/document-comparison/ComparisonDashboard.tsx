import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  GitCompare,
  FileText,
  Search,
  Plus,
  ArrowRight,
  Clock,
  User,
  Sparkles,
  History,
  X,
  Eye,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDocumentVersions } from '@/hooks/useDocumentVersions';
import { DocumentComparisonDialog } from './DocumentComparisonDialog';
import type { DocumentVersion, VersionComparison } from '@/types/versionControl';

interface ComparisonDashboardProps {
  documents?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    created_at: string;
    updated_at: string;
  }>;
}

interface ComparisonHistory {
  id: string;
  documentName: string;
  baseVersion: string;
  compareVersion: string;
  timestamp: string;
  changesCount: number;
}

export function ComparisonDashboard({ documents = [] }: ComparisonDashboardProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedBaseVersion, setSelectedBaseVersion] = useState<string | null>(null);
  const [selectedCompareVersion, setSelectedCompareVersion] = useState<string | null>(null);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  // Mock comparison history (in production, this would come from database)
  const [comparisonHistory] = useState<ComparisonHistory[]>([
    {
      id: '1',
      documentName: 'Contract Agreement.pdf',
      baseVersion: 'v1.0',
      compareVersion: 'v1.2',
      timestamp: new Date().toISOString(),
      changesCount: 12,
    },
    {
      id: '2',
      documentName: 'Invoice Template.docx',
      baseVersion: 'v2.1',
      compareVersion: 'v2.3',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      changesCount: 5,
    },
  ]);

  const { versions, compareVersions, isLoading } = useDocumentVersions({
    documentId: selectedDocumentId || '',
    autoRefresh: false,
  });

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    return documents.filter(doc => 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  const handleSelectDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    setSelectedBaseVersion(null);
    setSelectedCompareVersion(null);
    setShowDocumentSelector(false);
  };

  const handleCompare = async () => {
    if (!selectedBaseVersion || !selectedCompareVersion) return;
    
    try {
      const result = await compareVersions(selectedBaseVersion, selectedCompareVersion);
      setComparison(result);
      setShowComparisonDialog(true);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    }
  };

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Document Comparison</h2>
          <p className="text-muted-foreground">
            Compare document versions with visual diff and AI-powered analysis
          </p>
        </div>
        <Button onClick={() => setShowDocumentSelector(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Comparison
        </Button>
      </div>

      {/* Quick Start Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowDocumentSelector(true)}>
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <GitCompare className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Compare Versions</CardTitle>
            <CardDescription>
              Compare two versions of the same document
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors opacity-60">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <CardTitle className="text-lg">Compare Documents</CardTitle>
            <CardDescription>
              Compare two different documents (coming soon)
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors opacity-60">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <CardTitle className="text-lg">AI Analysis</CardTitle>
            <CardDescription>
              Get AI-powered change summaries (coming soon)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Active Comparison Panel */}
      {selectedDocumentId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GitCompare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Active Comparison</CardTitle>
                  <CardDescription>{selectedDocument?.file_name}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDocumentId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No versions available for this document</p>
                <p className="text-sm">Create versions to enable comparison</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Base Version Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Base Version</label>
                    <Select value={selectedBaseVersion || ''} onValueChange={setSelectedBaseVersion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem 
                            key={version.id} 
                            value={version.id}
                            disabled={version.id === selectedCompareVersion}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono">v{version.major_version}.{version.minor_version}</span>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(version.created_at), 'MMM d, HH:mm')}
                              </span>
                              {version.is_current && (
                                <Badge variant="secondary" className="text-xs">Current</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compare Version Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Compare Version</label>
                    <Select value={selectedCompareVersion || ''} onValueChange={setSelectedCompareVersion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select compare version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem 
                            key={version.id} 
                            value={version.id}
                            disabled={version.id === selectedBaseVersion}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono">v{version.major_version}.{version.minor_version}</span>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(version.created_at), 'MMM d, HH:mm')}
                              </span>
                              {version.is_current && (
                                <Badge variant="secondary" className="text-xs">Current</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={handleCompare}
                    disabled={!selectedBaseVersion || !selectedCompareVersion}
                    className="gap-2"
                  >
                    <GitCompare className="h-4 w-4" />
                    Compare Versions
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Comparisons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Comparisons</CardTitle>
              <CardDescription>Your comparison history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {comparisonHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No comparison history yet</p>
              <p className="text-sm">Start by comparing two document versions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comparisonHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.documentName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{item.baseVersion}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-mono">{item.compareVersion}</span>
                        <span>•</span>
                        <span>{item.changesCount} changes</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Selector Dialog */}
      <Dialog open={showDocumentSelector} onOpenChange={setShowDocumentSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Document</DialogTitle>
            <DialogDescription>
              Choose a document to compare versions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[300px]">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No documents found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                        'hover:bg-muted',
                        selectedDocumentId === doc.id && 'bg-primary/10 border border-primary/20'
                      )}
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <DocumentComparisonDialog
        open={showComparisonDialog}
        onOpenChange={setShowComparisonDialog}
        comparison={comparison}
      />
    </div>
  );
}
