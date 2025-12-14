/**
 * JobDetailsView Component
 * Detailed view of a specific bulk processing job
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentListTable } from './DocumentListTable';
import { ProcessingLog, type LogEntry } from './ProcessingLog';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBulkProcessingUpdates } from '@/hooks/useBulkProcessingUpdates';
import { Wifi, WifiOff } from 'lucide-react';
import type { BulkJob, BulkJobDocument } from '@/types/bulk-processing';
import { formatDistanceToNow, format } from 'date-fns';

interface JobDetailsViewProps {
  jobId: string;
  onBack: () => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onStop?: (jobId: string) => void;
}

// Mock data - will be replaced with API calls
const mockJob: BulkJob = {
  id: '1',
  name: 'Daily Invoice Processing',
  config: {
    source: { type: 'folder', path: '/documents/invoices' },
    processing: { mode: 'once', batchSize: 10 },
    processingOptions: {
      priority: 3,
      maxRetries: 3,
      enableSignatureDetection: false,
      parallelWorkers: 10
    },
    notifications: {
      dashboardNotifications: true,
      completionAlerts: false,
      errorAlerts: false
    }
  },
  status: 'running',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  totalDocuments: 50,
  processedDocuments: 40,
  failedDocuments: 2,
  progress: 80,
  estimatedCompletionTime: '5 minutes'
};

const mockDocuments: BulkJobDocument[] = [
  {
    id: 'doc1',
    jobId: '1',
    name: 'invoice_001.pdf',
    status: 'completed',
    processingTime: 3200,
    extractedFieldsCount: 15,
    retryCount: 0,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 1 * 60 * 60 * 1000 + 3200).toISOString()
  },
  {
    id: 'doc2',
    jobId: '1',
    name: 'invoice_002.pdf',
    status: 'processing',
    retryCount: 0,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'doc3',
    jobId: '1',
    name: 'invoice_003.pdf',
    status: 'failed',
    processingTime: 5000,
    retryCount: 3,
    errorMessage: 'LLM API returned empty response',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

const mockLogs: LogEntry[] = [
  {
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    level: 'info',
    message: 'Job started'
  },
  {
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 1000).toISOString(),
    level: 'info',
    message: 'Processing invoice_001.pdf'
  },
  {
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 4200).toISOString(),
    level: 'success',
    message: 'invoice_001.pdf completed'
  },
  {
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000).toISOString(),
    level: 'info',
    message: 'Processing invoice_002.pdf'
  },
  {
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    level: 'warning',
    message: 'invoice_003.pdf failed - retrying (attempt 1/3)'
  },
  {
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    level: 'error',
    message: 'invoice_003.pdf failed after 3 retries - sent to review queue'
  }
];

export const JobDetailsView: React.FC<JobDetailsViewProps> = ({
  jobId,
  onBack,
  onPause,
  onResume,
  onStop
}) => {
  const [job, setJob] = useState<BulkJob | null>(mockJob);
  const [documents, setDocuments] = useState<BulkJobDocument[]>(mockDocuments);
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Real-time updates for this job
  const {
    isConnected,
    isWebSocket,
    isPolling
  } = useBulkProcessingUpdates({
    enabled: true,
    jobId: jobId,
    onJobUpdate: (updatedJob) => {
      if (updatedJob.id === jobId) {
        setJob(updatedJob);
      }
    },
    onDocumentsUpdate: (updatedDocuments) => {
      setDocuments(updatedDocuments);
    },
    onDocumentUpdate: (updatedDocument) => {
      setDocuments(prev => prev.map(doc => 
        doc.id === updatedDocument.id ? updatedDocument : doc
      ));
    },
    onError: (error) => {
      console.error('Update error:', error);
    }
  });

  useEffect(() => {
    fetchJobDetails();
    fetchDocuments();
    fetchLogs();
  }, [jobId]);

  const fetchJobDetails = async () => {
    setIsLoading(true);
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      const job = await bulkJobsApi.getJob(jobId);
      setJob(job);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch job details',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { bulkDocumentsApi } = await import('@/services/bulkProcessingApi');
      const documents = await bulkDocumentsApi.getJobDocuments(jobId);
      setDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch documents',
        variant: 'destructive'
      });
    }
  };

  const fetchLogs = async () => {
    try {
      // Note: Logs endpoint may not be implemented yet in backend
      // For now, we'll use an empty array or mock data
      const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
      if (!bulkApiUrl) throw new Error('VITE_BULK_API_URL is required');
      const response = await fetch(`${bulkApiUrl}/api/v1/bulk-jobs/${jobId}/logs`);
      if (response.ok) {
        const logs = await response.json();
        setLogs(logs);
      } else {
        // If endpoint doesn't exist, use empty array
        setLogs([]);
      }
    } catch (error) {
      // Silently fail for logs - endpoint may not be implemented yet
      console.warn('Failed to fetch logs:', error);
      setLogs([]);
    }
  };

  const handlePause = async () => {
    if (!onPause) return;
    try {
      await onPause(jobId);
      setJob(job ? { ...job, status: 'paused' } : null);
    } catch (error) {
      // Error handled by parent
    }
  };

  const handleResume = async () => {
    if (!onResume) return;
    try {
      await onResume(jobId);
      setJob(job ? { ...job, status: 'running' } : null);
    } catch (error) {
      // Error handled by parent
    }
  };

  const handleStop = async () => {
    if (!onStop) return;
    try {
      await onStop(jobId);
      setJob(job ? { ...job, status: 'stopped' } : null);
    } catch (error) {
      // Error handled by parent
    }
  };

  const handleRetryDocument = async (documentId: string) => {
    try {
      const { bulkDocumentsApi } = await import('@/services/bulkProcessingApi');
      await bulkDocumentsApi.retryDocument(jobId, documentId);
      toast({
        title: 'Success',
        description: 'Document retry initiated'
      });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry document',
        variant: 'destructive'
      });
    }
  };

  const formatSourceType = (): string => {
    if (!job) return 'Unknown';
    switch (job.config.source.type) {
      case 'folder':
        return 'Folder/File System';
      case 'database':
        return 'Database';
      case 'cloud':
        return 'Cloud Storage';
      default:
        return 'Unknown';
    }
  };


  if (isLoading && !job) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Job not found</h3>
                <p className="text-muted-foreground mb-4">
                  The job you're looking for doesn't exist or has been deleted.
                </p>
                <Button onClick={onBack}>Back to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold">{job.name}</h1>
                <p className="text-muted-foreground mt-1">
                  Job ID: {job.id}
                </p>
              </div>
              {isConnected && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {isWebSocket ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-yellow-500" />
                      <span>Polling</span>
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {job.status === 'running' && onPause && (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            {job.status === 'paused' && onResume && (
              <Button onClick={handleResume}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}
            {(job.status === 'running' || job.status === 'paused') && onStop && (
              <Button variant="destructive" onClick={handleStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Source</div>
                <div className="font-medium">{formatSourceType()}</div>
                {job.config.source.type === 'folder' && (
                  <div className="text-sm text-muted-foreground font-mono mt-1">
                    {(job.config.source as any).path}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Processing Mode</div>
                <div className="font-medium">
                  {job.config.processing?.mode === 'continuous' ? 'Continuous' : 'Process Once'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Batch Size: {job.config.processing?.batchSize || 10}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div>
                  {job.status === 'running' && (
                    <Badge variant="default" className="bg-blue-500">
                      <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
                      Processing
                    </Badge>
                  )}
                  {job.status === 'completed' && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {job.status === 'paused' && (
                    <Badge variant="secondary">Paused</Badge>
                  )}
                  {job.status === 'failed' && (
                    <Badge variant="destructive">Failed</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Started</div>
                <div className="font-medium">
                  {job.startedAt
                    ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                    : 'Not started'}
                </div>
              </div>
            </div>

            {/* Progress */}
            {(job.status === 'running' || job.status === 'paused') && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {job.processedDocuments} / {job.totalDocuments} documents
                  </span>
                </div>
                <Progress value={job.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{job.progress.toFixed(1)}% complete</span>
                  {job.estimatedCompletionTime && (
                    <span>Est. {job.estimatedCompletionTime}</span>
                  )}
                </div>
              </div>
            )}

            {/* Completed Status */}
            {job.status === 'completed' && (
              <div className="mt-6 flex items-center gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {job.processedDocuments} / {job.totalDocuments}
                  </div>
                </div>
                {job.failedDocuments > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {job.failedDocuments}
                    </div>
                  </div>
                )}
                {job.completedAt && (
                  <div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-sm font-medium">
                      {format(new Date(job.completedAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Documents and Logs */}
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Processing Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentListTable
                  documents={documents}
                  onViewDocument={(docId) => {
                    // TODO: Navigate to document details
                    console.log('View document:', docId);
                  }}
                  onRetry={handleRetryDocument}
                  onDownload={(docId) => {
                    // TODO: Download document
                    console.log('Download document:', docId);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <ProcessingLog logs={logs} autoScroll={job.status === 'running'} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

