/**
 * BulkProcessingDashboard Component
 * Main dashboard for bulk processing jobs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatisticsPanel } from './StatisticsPanel';
import { ActiveJobsList } from './ActiveJobsList';
import { ManualReviewQueue } from './ManualReviewQueue';
import { JobDetailsPanel } from './JobDetailsPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { BulkUploadModal } from './BulkUploadModal';
import { Plus, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBulkProcessingUpdates } from '@/hooks/useBulkProcessingUpdates';
import { Badge } from '@/components/ui/badge';
import type { BulkJob, BulkStatistics } from '@/types/bulk-processing';

interface BulkProcessingDashboardProps {
  onCreateNewJob?: () => void;
  onViewJobDetails?: (jobId: string) => void;
  onBack?: () => void;
  showReviewQueue?: boolean;
  onShowReviewQueue?: (show: boolean) => void;
}

// Mock data - will be replaced with API calls
const mockStatistics: BulkStatistics = {
  totalProcessedToday: 150,
  totalProcessedWeek: 850,
  totalProcessedMonth: 3200,
  successRate: 98.5,
  averageProcessingTime: 4200, // milliseconds
  documentsInReviewQueue: 12
};

const mockJobs: BulkJob[] = [
  {
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
    failedDocuments: 0,
    progress: 80,
    estimatedCompletionTime: '5 minutes'
  },
  {
    id: '2',
    name: 'Weekly Report Processing',
    config: {
      source: { type: 'folder', path: '/documents/reports' },
      processing: { mode: 'continuous', batchSize: 25 },
      processingOptions: {
        priority: 2,
        maxRetries: 3,
        enableSignatureDetection: true,
        parallelWorkers: 15
      },
      notifications: {
        dashboardNotifications: true,
        completionAlerts: true,
        errorAlerts: true
      }
    },
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    totalDocuments: 25,
    processedDocuments: 25,
    failedDocuments: 0,
    progress: 100
  }
];

export const BulkProcessingDashboard: React.FC<BulkProcessingDashboardProps> = ({
  onCreateNewJob,
  onViewJobDetails,
  onBack,
  showReviewQueue = false,
  onShowReviewQueue
}) => {
  const [jobs, setJobs] = useState<BulkJob[]>(mockJobs);
  const [statistics, setStatistics] = useState<BulkStatistics>(mockStatistics);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { toast } = useToast();

  // Real-time updates
  const {
    updateMethod,
    isConnected,
    connectionStatus,
    isWebSocket,
    isPolling
  } = useBulkProcessingUpdates({
    enabled: true,
    onJobsUpdate: (updatedJobs) => {
      setJobs(updatedJobs);
    },
    onJobUpdate: (updatedJob) => {
      setJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
    },
    onError: (error) => {
      console.error('Update error:', error);
    }
  });

  const fetchJobs = async () => {
    setIsRefreshing(true);
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      const jobs = await bulkJobsApi.getJobs();
      setJobs(jobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch jobs',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { bulkStatisticsApi } = await import('@/services/bulkProcessingApi');
      const stats = await bulkStatisticsApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch statistics',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchJobs(), fetchStatistics()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Update statistics when jobs change
  useEffect(() => {
    const hasRunningJobs = jobs.some(job => job.status === 'running');
    if (hasRunningJobs || jobs.length > 0) {
      // Update statistics based on jobs
      const totalProcessed = jobs.reduce((sum, job) => sum + job.processedDocuments, 0);
      const totalFailed = jobs.reduce((sum, job) => sum + job.failedDocuments, 0);
      const successRate = totalProcessed > 0 
        ? ((totalProcessed - totalFailed) / totalProcessed) * 100 
        : 100;
      
      setStatistics(prev => ({
        ...prev,
        totalProcessedToday: totalProcessed,
        successRate,
        documentsInReviewQueue: totalFailed
      }));
    }
  }, [jobs]);

  const handlePause = async (jobId: string) => {
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      const updatedJob = await bulkJobsApi.pauseJob(jobId);
      setJobs(jobs.map(job => 
        job.id === jobId ? updatedJob : job
      ));
      toast({
        title: 'Success',
        description: 'Job paused successfully'
      });
    } catch (error) {
      console.error('Failed to pause job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to pause job',
        variant: 'destructive'
      });
    }
  };

  const handleResume = async (jobId: string) => {
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      const updatedJob = await bulkJobsApi.resumeJob(jobId);
      setJobs(jobs.map(job => 
        job.id === jobId ? updatedJob : job
      ));
      toast({
        title: 'Success',
        description: 'Job resumed successfully'
      });
    } catch (error) {
      console.error('Failed to resume job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resume job',
        variant: 'destructive'
      });
    }
  };

  const handleStop = async (jobId: string) => {
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      const updatedJob = await bulkJobsApi.stopJob(jobId);
      setJobs(jobs.map(job => 
        job.id === jobId ? updatedJob : job
      ));
      toast({
        title: 'Success',
        description: 'Job stopped successfully'
      });
    } catch (error) {
      console.error('Failed to stop job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop job',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const { bulkJobsApi } = await import('@/services/bulkProcessingApi');
      await bulkJobsApi.deleteJob(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
      toast({
        title: 'Success',
        description: 'Job deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job',
        variant: 'destructive'
      });
    }
  };

  const handleViewDetails = (jobId: string) => {
    if (onViewJobDetails) {
      onViewJobDetails(jobId);
    } else {
      setSelectedJobId(jobId);
    }
  };

  // Note: Review queue is now handled by parent component
  // This check is kept for backward compatibility but shouldn't be reached
  if (showReviewQueue) {
    return null; // Review queue is handled in Upload.tsx
  }

  // Show job details if a job is selected
  if (selectedJobId) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-7xl mx-auto px-4">
          <JobDetailsPanel 
            jobId={selectedJobId} 
            onBack={() => setSelectedJobId(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Bulk Processing Dashboard</h1>
              <ConnectionStatus 
                isWebSocketConnected={isConnected}
                webSocketStatus={connectionStatus}
                compact={true}
              />
            </div>
            <p className="text-muted-foreground mt-1">
              Monitor and manage your bulk document processing jobs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchJobs();
                fetchStatistics();
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => onCreateNewJob ? onCreateNewJob() : setShowUploadModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Job
            </Button>
          </div>
        </div>

        {/* Statistics Panel */}
        <StatisticsPanel statistics={statistics} isLoading={isLoading} />

        {/* Quick Actions */}
        {statistics.documentsInReviewQueue > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-semibold text-orange-900">
                      {statistics.documentsInReviewQueue} documents need review
                    </div>
                    <div className="text-sm text-orange-700">
                      Some documents failed processing and require manual review
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-orange-300"
                  onClick={() => onShowReviewQueue?.(true)}
                >
                  View Review Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Jobs List */}
        <ActiveJobsList
          jobs={jobs}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onDelete={handleDelete}
          onCreateNew={() => setShowUploadModal(true)}
        />

        {/* Upload Modal */}
        <BulkUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onJobCreated={(jobId) => {
            setShowUploadModal(false);
            fetchJobs(); // Refresh jobs list
            toast({
              title: 'Job created!',
              description: 'Your bulk processing job has been created',
            });
          }}
        />
      </div>
    </div>
  );
};

