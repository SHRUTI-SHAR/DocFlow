/**
 * JobDetailsPanel Component
 * Shows detailed view of a bulk processing job with real-time updates and export options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  Play, 
  Pause, 
  Square, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBulkProcessingWebSocket } from '@/hooks/useBulkProcessingWebSocket';
import { bulkJobsApi, bulkDocumentsApi, bulkExportApi } from '@/services/bulkProcessingApi';
import type { BulkJob, BulkJobDocument } from '@/types/bulk-processing';
import { cn } from '@/lib/utils';

interface JobDetailsPanelProps {
  jobId: string;
  onBack?: () => void;
}

interface FieldExtraction {
  document_id: string;
  page_number: number;
  field_name: string;
  field_value: string;
  confidence: number;
}

export const JobDetailsPanel: React.FC<JobDetailsPanelProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<BulkJob | null>(null);
  const [documents, setDocuments] = useState<BulkJobDocument[]>([]);
  const [recentExtractions, setRecentExtractions] = useState<FieldExtraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'csv' | 'excel-pivoted' | 'excel-summary' | null>(null);
  const { toast } = useToast();

  // Real-time updates via WebSocket
  const { isConnected, connectionStatus } = useBulkProcessingWebSocket({
    jobId,
    enabled: true,
    onJobUpdate: (updatedJob) => {
      setJob(updatedJob);
    },
    onDocumentUpdate: (updatedDoc) => {
      setDocuments(prev => {
        const existing = prev.find(d => d.id === updatedDoc.id);
        if (existing) {
          return prev.map(d => d.id === updatedDoc.id ? updatedDoc : d);
        }
        return [...prev, updatedDoc];
      });

      // Add to recent extractions when document completes
      if (updatedDoc.status === 'completed' && updatedDoc.extractedData) {
        const newExtractions: FieldExtraction[] = Object.entries(updatedDoc.extractedData).map(([field, value]) => ({
          document_id: updatedDoc.id,
          page_number: 1,
          field_name: field,
          field_value: String(value),
          confidence: 0.95
        }));
        setRecentExtractions(prev => [...newExtractions, ...prev].slice(0, 50));
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [jobData, documentsData] = await Promise.all([
          bulkJobsApi.getJob(jobId),
          bulkDocumentsApi.getJobDocuments(jobId)
        ]);
        setJob(jobData);
        setDocuments(documentsData);
      } catch (error) {
        console.error('Failed to fetch job details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load job details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [jobId, toast]);

  const handleJobAction = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      let updatedJob: BulkJob;
      switch (action) {
        case 'start':
          updatedJob = await bulkJobsApi.startJob(jobId);
          break;
        case 'pause':
          updatedJob = await bulkJobsApi.pauseJob(jobId);
          break;
        case 'resume':
          updatedJob = await bulkJobsApi.resumeJob(jobId);
          break;
        case 'stop':
          updatedJob = await bulkJobsApi.stopJob(jobId);
          break;
      }
      setJob(updatedJob);
      toast({
        title: 'Success',
        description: `Job ${action}ed successfully`,
      });
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} job`,
        variant: 'destructive'
      });
    }
  };

  const handleExport = async (format: 'csv' | 'excel-pivoted' | 'excel-summary') => {
    setIsExporting(format);
    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'csv':
          blob = await bulkExportApi.exportToCsv(jobId);
          filename = `${job?.name || 'job'}_${jobId}_export.csv`;
          break;
        case 'excel-pivoted':
          blob = await bulkExportApi.exportToExcelPivoted(jobId);
          filename = `${job?.name || 'job'}_${jobId}_pivoted.xlsx`;
          break;
        case 'excel-summary':
          blob = await bulkExportApi.exportToExcelSummary(jobId);
          filename = `${job?.name || 'job'}_${jobId}_summary.xlsx`;
          break;
      }

      bulkExportApi.downloadBlob(blob, filename);
      
      toast({
        title: 'Export successful',
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completedDocs = documents.filter(d => d.status === 'completed').length;
  const failedDocs = documents.filter(d => d.status === 'failed').length;
  const processingDocs = documents.filter(d => d.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{job.name}</h2>
            <Badge variant={
              job.status === 'running' ? 'default' : 
              job.status === 'completed' ? 'success' :
              job.status === 'failed' ? 'destructive' :
              'secondary'
            }>
              {job.status}
            </Badge>
            {isConnected && (
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3 text-green-500" />
                Live
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Job ID: {job.id}</p>
        </div>
        <div className="flex gap-2">
          {job.status === 'pending' && (
            <Button onClick={() => handleJobAction('start')}>
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          {job.status === 'running' && (
            <>
              <Button variant="outline" onClick={() => handleJobAction('pause')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="destructive" onClick={() => handleJobAction('stop')}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          {job.status === 'paused' && (
            <Button onClick={() => handleJobAction('resume')}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{job.totalDocuments}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedDocs}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{processingDocs}</div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedDocs}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {job.estimatedCompletionTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimated completion: {job.estimatedCompletionTime}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => handleExport('csv')}
              disabled={isExporting !== null || completedDocs === 0}
            >
              {isExporting === 'csv' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              CSV Export
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => handleExport('excel-pivoted')}
              disabled={isExporting !== null || completedDocs === 0}
            >
              {isExporting === 'excel-pivoted' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Excel (Pivoted)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => handleExport('excel-summary')}
              disabled={isExporting !== null || completedDocs === 0}
            >
              {isExporting === 'excel-summary' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Excel (Summary)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Export formats available: CSV (flat), Excel Pivoted (fields as columns), Excel Summary (document stats)
          </p>
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="extractions">
            Recent Extractions
            {recentExtractions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{recentExtractions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-2">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Document</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Pages</th>
                      <th className="text-left p-3 text-sm font-medium">Fields</th>
                      <th className="text-left p-3 text-sm font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm">{doc.fileName}</td>
                        <td className="p-3">
                          <Badge variant={
                            doc.status === 'completed' ? 'success' :
                            doc.status === 'failed' ? 'destructive' :
                            doc.status === 'processing' ? 'default' :
                            'secondary'
                          } className="text-xs">
                            {doc.status === 'processing' && (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            )}
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{doc.pageCount || '-'}</td>
                        <td className="p-3 text-sm">
                          {doc.extractedData ? Object.keys(doc.extractedData).length : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {doc.processingTime ? `${doc.processingTime}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extractions" className="space-y-2">
          <Card>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {recentExtractions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Field extractions will appear here in real-time</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Field Name</th>
                        <th className="text-left p-3 text-sm font-medium">Value</th>
                        <th className="text-left p-3 text-sm font-medium">Confidence</th>
                        <th className="text-left p-3 text-sm font-medium">Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExtractions.map((extraction, idx) => (
                        <tr key={`${extraction.document_id}-${extraction.field_name}-${idx}`} className="border-b hover:bg-muted/30 animate-in fade-in slide-in-from-top-2">
                          <td className="p-3 text-sm font-medium">{extraction.field_name}</td>
                          <td className="p-3 text-sm">{extraction.field_value}</td>
                          <td className="p-3 text-sm">
                            <Badge variant={extraction.confidence > 0.9 ? 'success' : 'secondary'}>
                              {(extraction.confidence * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground truncate max-w-xs">
                            {extraction.document_id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
