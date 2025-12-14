/**
 * ReviewStep Component
 * Step 3 of the bulk processing wizard - Review and start
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock, FolderTree, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkJobsApi, getBulkApiBaseUrl } from '@/services/bulkProcessingApi';
import type { BulkJobConfig, SourceType } from '@/types/bulk-processing';

interface ReviewStepProps {
  config: Partial<BulkJobConfig>;
  onBack: () => void;
  onComplete: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  config,
  onBack,
  onComplete
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [estimatedDocuments, setEstimatedDocuments] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate estimates when config changes
  useEffect(() => {
    const calculateEstimates = async () => {
      if (!config.source || config.source.type !== 'folder') {
        setEstimatedDocuments(null);
        setEstimatedTime(null);
        setEstimatedCost(null);
        return;
      }

      const folderSource = config.source as any;
      if (!folderSource.path || folderSource.path.trim().length === 0) {
        setEstimatedDocuments(null);
        setEstimatedTime(null);
        setEstimatedCost(null);
        return;
      }

      setIsCalculating(true);
      try {
        // Try to get estimate from backend API
        const apiUrl = getBulkApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/v1/estimate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source_type: 'folder',
            source_config: {
              path: folderSource.path,
              file_types: folderSource.fileTypes || ['pdf'],
              recursive: folderSource.recursive || false
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          setEstimatedDocuments(data.estimated_documents || null);
          
          // Calculate processing time
          if (data.estimated_documents && config.processingOptions?.parallelWorkers) {
            const avgTimePerDoc = 8; // seconds (average processing time per document)
            const parallelWorkers = config.processingOptions.parallelWorkers || 10;
            const totalSeconds = Math.ceil((data.estimated_documents / parallelWorkers) * avgTimePerDoc);
            setEstimatedTime(formatTime(totalSeconds));
          } else {
            setEstimatedTime(null);
          }

          // Calculate cost if enabled
          if (config.processingOptions?.enableCostTracking && data.estimated_documents) {
            // Rough estimate: ₹0.10 per document (adjust based on your actual costs)
            const costPerDoc = 0.10;
            const totalCost = data.estimated_documents * costPerDoc;
            setEstimatedCost(`₹${totalCost.toFixed(2)}`);
          } else {
            setEstimatedCost(null);
          }
        } else {
          // Fallback: Use simple estimation
          estimateFallback();
        }
      } catch (error) {
        console.warn('Failed to get estimates from API, using fallback:', error);
        // Fallback: Use simple estimation
        estimateFallback();
      } finally {
        setIsCalculating(false);
      }
    };

    const estimateFallback = () => {
      // Simple fallback estimation based on batch size
      // This is just a rough estimate
      const batchSize = config.processing?.batchSize || 10;
      const estimatedDocs = batchSize * 2; // Rough estimate: 2x batch size
      setEstimatedDocuments(estimatedDocs);
      
      if (config.processingOptions?.parallelWorkers) {
        const avgTimePerDoc = 8; // seconds
        const parallelWorkers = config.processingOptions.parallelWorkers || 10;
        const totalSeconds = Math.ceil((estimatedDocs / parallelWorkers) * avgTimePerDoc);
        setEstimatedTime(formatTime(totalSeconds));
      }

      if (config.processingOptions?.enableCostTracking) {
        const costPerDoc = 0.10;
        const totalCost = estimatedDocs * costPerDoc;
        setEstimatedCost(`₹${totalCost.toFixed(2)}`);
      }
    };

    calculateEstimates();
  }, [config.source, config.processing, config.processingOptions]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  };

  const handleStart = async () => {
    if (!config.source || !config.processing || !config.processingOptions) {
      toast({
        title: 'Error',
        description: 'Please complete all configuration steps',
        variant: 'destructive'
      });
      return;
    }

    setIsStarting(true);
    try {
      // Generate job name from source config
      const jobName = config.source.type === 'folder' 
        ? `Bulk Job - ${(config.source as any).path?.split(/[/\\]/).pop() || 'Folder'}`
        : `Bulk Job - ${config.source.type}`;

      // Create job via API - Backend-bulk format
      const job = await bulkJobsApi.createJob({
        name: jobName,
        source_type: config.source.type,
        source_config: config.source.type === 'folder' 
          ? {
              path: (config.source as any).path,
              file_types: (config.source as any).fileTypes || ['pdf'],
              recursive: (config.source as any).includeSubfolders || false
            }
          : config.source,
        processing_config: {
          mode: config.processing.mode,
          discovery_batch_size: config.processing.batchSize || 50
        },
        processing_options: {
          priority: config.processingOptions.priority || 3,
          max_retries: config.processingOptions.maxRetries || 3,
          parallel_workers: config.processingOptions.parallelWorkers || 10,
          signature_detection: config.processingOptions.enableSignatureDetection !== false,
          retry_delay: 60,
          exponential_backoff: true,
          send_to_review_queue: true,
          cost_tracking: true,
          detailed_logging: false
        }
      });

      toast({
        title: 'Success',
        description: 'Bulk processing job created successfully'
      });

      // Start the job
      await bulkJobsApi.startJob(job.id);

      onComplete();
    } catch (error) {
      console.error('Failed to create job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create bulk processing job',
        variant: 'destructive'
      });
    } finally {
      setIsStarting(false);
    }
  };

  const formatSourceType = (type?: SourceType): string => {
    switch (type) {
      case 'folder':
        return 'Folder/File System';
      case 'database':
        return 'Database';
      case 'cloud':
        return 'Cloud Storage';
      default:
        return 'Not configured';
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Configuration</h3>
        <p className="text-muted-foreground mb-6">
          Review your configuration before starting the bulk processing job
        </p>
      </div>

      <div className="grid gap-4">
        {/* Source Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Source Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source Type:</span>
              <span className="font-medium">{formatSourceType(config.source?.type)}</span>
            </div>
            {config.source?.type === 'folder' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Path:</span>
                  <span className="font-medium font-mono text-sm">
                    {(config.source as any).path || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Types:</span>
                  <div className="flex gap-1">
                    {((config.source as any).fileTypes || []).map((type: string) => (
                      <Badge key={type} variant="secondary">{type.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recursive:</span>
                  <Badge variant={(config.source as any).recursive ? 'default' : 'secondary'}>
                    {(config.source as any).recursive ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Processing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Mode:</span>
              <Badge variant="outline">
                {config.processing?.mode === 'continuous' ? 'Continuous' : 'Process Once'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discovery Batch Size:</span>
              <span className="font-medium">{config.processing?.batchSize || 10} documents</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Documents discovered per scan cycle. Processing concurrency controlled by Parallel Workers.
            </p>
          </CardContent>
        </Card>

        {/* Processing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Processing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority:</span>
              <Badge variant="outline">
                {config.processingOptions?.priority || 3}/5
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Retries:</span>
              <span className="font-medium">{config.processingOptions?.maxRetries || 3}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parallel Workers:</span>
              <span className="font-medium">
                {config.processingOptions?.parallelWorkers || 10}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signature Detection:</span>
              <Badge variant={config.processingOptions?.enableSignatureDetection ? 'default' : 'secondary'}>
                {config.processingOptions?.enableSignatureDetection ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Estimates */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>
              Estimated processing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Documents:</span>
              <span className="font-medium">
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating...
                  </span>
                ) : estimatedDocuments !== null ? (
                  `${estimatedDocuments.toLocaleString()} documents`
                ) : (
                  'N/A'
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Processing Time:</span>
              <span className="font-medium">
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating...
                  </span>
                ) : estimatedTime ? (
                  estimatedTime
                ) : (
                  'N/A'
                )}
              </span>
            </div>
            {config.processingOptions?.enableCostTracking && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Cost:</span>
                <span className="font-medium">
                  {isCalculating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculating...
                    </span>
                  ) : estimatedCost ? (
                    estimatedCost
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} size="lg" disabled={isStarting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleStart} size="lg" disabled={isStarting}>
          {isStarting ? (
            <>
              <span className="mr-2">Starting...</span>
            </>
          ) : (
            <>
              Start Processing
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

