/**
 * Job Details View - Clean and Simple
 * Shows job overview + list of documents
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  Download,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { bulkJobsApi, bulkDocumentsApi } from '@/services/bulkProcessingApi';
import type { BulkJob, BulkJobDocument } from '@/types/bulk-processing';
import { BulkDocumentViewer } from './BulkDocumentViewer';
import { ExcelMappingFlow } from './ExcelMappingFlow';

interface JobDetailsViewNewProps {
  jobId: string;
  onBack: () => void;
}

export const JobDetailsViewNew: React.FC<JobDetailsViewNewProps> = ({
  jobId,
  onBack
}) => {
  const [job, setJob] = useState<BulkJob | null>(null);
  const [documents, setDocuments] = useState<BulkJobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<BulkJobDocument | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showExcelMapping, setShowExcelMapping] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('Initializing...');

  const fetchJobDetails = async () => {
    try {
      setRefreshing(true);
      const [jobData, docsData] = await Promise.all([
        bulkJobsApi.getJob(jobId),
        bulkDocumentsApi.getJobDocuments(jobId, { limit: 100 })
      ]);
      setJob(jobData);
      setDocuments(docsData || []);
      setError(null);
      
      // Update processing message based on document status
      if (jobData.status === 'running' || jobData.status === 'pending') {
        const processed = jobData.processedDocuments || 0;
        const total = jobData.totalDocuments || 1;
        
        // Find the currently processing document
        const processingDoc = docsData?.find((d: BulkJobDocument) => d.status === 'processing');
        
        if (processingDoc) {
          // Use the real-time processing stage from the document
          const stage = (processingDoc as any).processingStage;
          const pagesProcessed = (processingDoc as any).pagesProcessed || 0;
          const totalPages = (processingDoc as any).totalPages || 0;
          
          if (stage) {
            setProcessingMessage(stage);
          } else if (totalPages > 0) {
            setProcessingMessage(`Processing page ${pagesProcessed}/${totalPages}...`);
          } else {
            setProcessingMessage(`Processing ${processingDoc.name || 'document'}...`);
          }
        } else if (processed === 0) {
          setProcessingMessage('Starting extraction...');
        } else if (processed < total) {
          setProcessingMessage(`Processing document ${processed + 1} of ${total}...`);
        } else {
          setProcessingMessage('Finalizing...');
        }
      }
    } catch (err) {
      setError('Failed to load job details');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Smooth progress animation - includes page-level progress
  useEffect(() => {
    if (job && documents) {
      let targetProgress = 0;
      const totalDocs = job.totalDocuments || 1;
      const completedDocs = job.processedDocuments || 0;
      
      // Base progress from completed documents
      const docProgress = (completedDocs / totalDocs) * 100;
      
      // Add page-level progress for currently processing document
      const processingDoc = documents.find((d: BulkJobDocument) => d.status === 'processing');
      let pageProgress = 0;
      
      if (processingDoc) {
        const pagesProcessed = (processingDoc as any).pagesProcessed || 0;
        const totalPages = (processingDoc as any).totalPages || 0;
        
        if (totalPages > 0) {
          // This document's contribution to overall progress
          const docContribution = (1 / totalDocs) * 100;
          pageProgress = (pagesProcessed / totalPages) * docContribution;
        } else {
          // If we don't know total pages yet, show at least some progress
          pageProgress = (1 / totalDocs) * 10; // 10% of doc's contribution as "started"
        }
      }
      
      targetProgress = Math.min(99, Math.round(docProgress + pageProgress));
      
      // Ensure at least 5% progress if job is running
      if ((job.status === 'running' || job.status === 'processing') && targetProgress < 5) {
        targetProgress = 5;
      }
      
      // 100% only when truly completed
      if (job.status === 'completed') {
        targetProgress = 100;
      }
      
      // Smoothly animate to target progress
      const animateProgress = () => {
        setDisplayProgress(prev => {
          if (prev < targetProgress) {
            return Math.min(prev + 1, targetProgress);
          }
          return targetProgress;
        });
      };
      
      const interval = setInterval(animateProgress, 50);
      return () => clearInterval(interval);
    }
  }, [job?.processedDocuments, job?.totalDocuments, job?.status, documents]);

  useEffect(() => {
    fetchJobDetails();
    
    // Fast polling when job is running (every 2 seconds), slower when idle
    const pollInterval = job?.status === 'running' ? 2000 : 10000;
    const interval = setInterval(() => {
      if (job?.status === 'running' || job?.status === 'pending') {
        fetchJobDetails();
      }
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Loader2 className="w-3 h-3" /> },
      running: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      processing: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      completed: { variant: 'outline', icon: <CheckCircle2 className="w-3 h-3 text-green-500" /> },
      failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
      paused: { variant: 'secondary', icon: <AlertCircle className="w-3 h-3 text-yellow-500" /> },
      stopped: { variant: 'secondary', icon: <XCircle className="w-3 h-3" /> }
    };
    const config = configs[status] || configs.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Show Excel mapping flow
  if (showExcelMapping && job) {
    return (
      <ExcelMappingFlow
        jobId={jobId}
        jobName={job.name || `Job ${job.id.slice(0, 8)}`}
        onBack={() => setShowExcelMapping(false)}
      />
    );
  }

  // Show document viewer if a document is selected
  if (selectedDocument) {
    return (
      <BulkDocumentViewer
        jobId={jobId}
        documentId={selectedDocument.id}
        documentName={selectedDocument.name}
        onBack={() => setSelectedDocument(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading job details...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="border-destructive">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Job</h3>
              <p className="text-muted-foreground">{error || 'Job not found'}</p>
              <Button onClick={fetchJobDetails} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completedDocuments = job.processedDocuments - job.failedDocuments;
  const progress = displayProgress;  // Use animated progress

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{job.name || `Job ${job.id.slice(0, 8)}`}</h1>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchJobDetails}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {/* Show Export button when there are completed documents */}
              {(job.status === 'completed' || job.processedDocuments > 0) && (
                <Button variant="default" size="sm" onClick={() => setShowExcelMapping(true)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{job.totalDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{job.failedDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  {getStatusBadge(job.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{progress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar - Enhanced */}
        {(job.status === 'running' || job.status === 'pending') && (
          <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-background">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-medium">Processing Documents</span>
                </div>
                <span className="text-lg font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3 mb-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{processingMessage}</span>
                <span>{job.processedDocuments} / {job.totalDocuments} documents</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Documents</CardTitle>
            <span className="text-sm text-muted-foreground">
              {documents.length} documents
            </span>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No documents in this job</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded bg-muted">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.extractedFieldsCount ? `${doc.extractedFieldsCount} fields` : 'Processing...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(doc.status)}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetailsViewNew;
