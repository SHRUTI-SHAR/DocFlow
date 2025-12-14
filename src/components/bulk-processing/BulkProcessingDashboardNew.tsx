/**
 * BulkProcessingDashboard Component
 * Clean, simple dashboard for bulk processing jobs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  RefreshCw, 
  Play, 
  Pause, 
  Square, 
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkJobsApi, bulkExportApi } from '@/services/bulkProcessingApi';
import type { BulkJob } from '@/types/bulk-processing';
import { formatDistanceToNow } from 'date-fns';

interface BulkProcessingDashboardProps {
  onCreateNewJob?: () => void;
  onViewJobDetails?: (jobId: string) => void;
  onBack?: () => void;
}

export const BulkProcessingDashboardNew: React.FC<BulkProcessingDashboardProps> = ({
  onCreateNewJob,
  onViewJobDetails,
  onBack
}) => {
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewQueueCount, setReviewQueueCount] = useState(0);
  const { toast } = useToast();

  // Fetch jobs on mount and periodically
  useEffect(() => {
    fetchJobs();
    fetchReviewQueue();
    const interval = setInterval(() => {
      fetchJobs();
      fetchReviewQueue();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const fetchedJobs = await bulkJobsApi.getJobs();
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      if (isLoading) {
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to backend. Make sure the server is running.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchReviewQueue = async () => {
    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      const items = await reviewQueueApi.getReviewQueue();
      setReviewQueueCount(items.length);
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchJobs();
    fetchReviewQueue();
  };

  const handlePause = async (jobId: string) => {
    try {
      await bulkJobsApi.pauseJob(jobId);
      toast({ title: 'Job paused' });
      fetchJobs();
    } catch (error) {
      toast({ title: 'Failed to pause job', variant: 'destructive' });
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      await bulkJobsApi.resumeJob(jobId);
      toast({ title: 'Job resumed' });
      fetchJobs();
    } catch (error) {
      toast({ title: 'Failed to resume job', variant: 'destructive' });
    }
  };

  const handleStop = async (jobId: string) => {
    try {
      await bulkJobsApi.stopJob(jobId);
      toast({ title: 'Job stopped' });
      fetchJobs();
    } catch (error) {
      toast({ title: 'Failed to stop job', variant: 'destructive' });
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await bulkJobsApi.deleteJob(jobId);
      toast({ title: 'Job deleted' });
      fetchJobs();
    } catch (error) {
      toast({ title: 'Failed to delete job', variant: 'destructive' });
    }
  };

  const handleExport = async (jobId: string, jobName: string) => {
    try {
      const blob = await bulkExportApi.exportToExcelPivoted(jobId);
      bulkExportApi.downloadBlob(blob, `${jobName}_export.xlsx`);
      toast({ title: 'Export downloaded' });
    } catch (error) {
      toast({ title: 'Failed to export', variant: 'destructive' });
    }
  };

  const getStatusBadge = (job: BulkJob) => {
    const status = job.status;
    
    // Show "Needs Review" badge if any documents need review
    if (job.documentsNeedingReview && job.documentsNeedingReview > 0) {
      return (
        <Badge className="bg-orange-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          Needs Review ({job.documentsNeedingReview})
        </Badge>
      );
    }
    
    switch (status) {
      case 'running':
      case 'processing':
        return (
          <Badge className="bg-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const runningJobs = jobs.filter(j => j.status === 'running').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedDocs = jobs.reduce((sum, j) => sum + (j.failedDocuments || 0), 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bulk Processing
              </button>
            )}
            <h1 className="text-2xl font-bold">Processing Jobs</h1>
            <p className="text-muted-foreground text-sm">
              Monitor and manage your bulk document processing
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/templates/manage'}>
              <FileText className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
            <Button size="sm" onClick={onCreateNewJob}>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                  <p className="text-2xl font-bold">{runningJobs}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedJobs}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Review</p>
                  <p className="text-2xl font-bold">{reviewQueueCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Documents</p>
                  <p className="text-2xl font-bold">{failedDocs}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No jobs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first bulk processing job to get started
                </p>
                <Button onClick={onCreateNewJob}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Job
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium">{job.name}</h3>
                          {getStatusBadge(job)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </span>
                          <span>
                            {job.processedDocuments} / {job.totalDocuments} documents
                          </span>
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {job.status === 'running' ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handlePause(job.id)}>
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStop(job.id)}>
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        ) : job.status === 'paused' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleResume(job.id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : null}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onViewJobDetails?.(job.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {job.status === 'completed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleExport(job.id, job.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(job.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar for active jobs */}
                    {job.status === 'running' && (
                      <div className="space-y-1">
                        <Progress value={job.progress || 0} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{(job.progress || 0).toFixed(1)}%</span>
                          {job.estimatedCompletionTime && (
                            <span>Est. {job.estimatedCompletionTime}</span>
                          )}
                        </div>
                      </div>
                    )}
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
