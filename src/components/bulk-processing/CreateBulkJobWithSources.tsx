/**
 * CreateBulkJobWithSources Component
 * Job creation with support for file upload, Google Drive, and OneDrive
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Upload, Folder, Cloud, Play, Loader2, Settings, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CloudSourceConfigSimple } from './CloudSourceConfigSimple';
import { bulkJobsApi } from '@/services/bulkProcessingApi';
import type { SourceType, GoogleDriveSourceConfig, OneDriveSourceConfig } from '@/types/bulk-processing';

// Get bulk API URL
const getBulkApiUrl = (): string => {
  const url = import.meta.env.VITE_BULK_API_URL;
  if (!url) throw new Error('VITE_BULK_API_URL is required');
  return url;
};

interface CreateBulkJobWithSourcesProps {
  onComplete: (jobId: string) => void;
  onCancel: () => void;
}

export const CreateBulkJobWithSources: React.FC<CreateBulkJobWithSourcesProps> = ({
  onComplete,
  onCancel
}) => {
  const [jobName, setJobName] = useState('');
  const [sourceType, setSourceType] = useState<'upload' | 'folder' | 'google_drive' | 'onedrive'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [folderPath, setFolderPath] = useState('');
  const [googleDriveConfig, setGoogleDriveConfig] = useState<Partial<GoogleDriveSourceConfig>>({
    type: 'google_drive',
    recursive: true,
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png']
  });
  const [oneDriveConfig, setOneDriveConfig] = useState<Partial<OneDriveSourceConfig>>({
    type: 'onedrive',
    recursive: true,
    fileTypes: ['.pdf', '.jpg', '.png'],
    clientId: '',
    tenantId: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Processing configuration state
  const [batchSize, setBatchSize] = useState(50);
  const [maxRetries, setMaxRetries] = useState(3);
  const [parallelWorkers, setParallelWorkers] = useState(10);
  const [retryDelay, setRetryDelay] = useState(60);
  
  // Advanced worker configuration
  const [workerConcurrency, setWorkerConcurrency] = useState(50);
  const [workerPrefetch, setWorkerPrefetch] = useState(2);
  const [pagesPerThread, setPagesPerThread] = useState(5);
  const [checkpointInterval, setCheckpointInterval] = useState(50);
  
  const { toast } = useToast();

  const handleCreateJob = async () => {
    if (!jobName.trim()) {
      toast({ title: 'Please enter a job name', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      let sourceConfig: any;
      let actualSourceType: string = sourceType; // For backend

      if (sourceType === 'upload') {
        if (uploadedFiles.length === 0) {
          toast({ title: 'Please upload at least one file', variant: 'destructive' });
          setIsCreating(false);
          return;
        }
        
        // Upload files first
        const formData = new FormData();
        uploadedFiles.forEach(file => formData.append('files', file));
        
        const uploadResponse = await fetch(`${getBulkApiUrl()}/api/v1/bulk-jobs/upload-files`, {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload files');
        }
        
        const uploadResult = await uploadResponse.json();
        console.log('Upload result:', uploadResult);
        
        // Change source_type to 'folder' for backend since uploads go to a folder
        actualSourceType = 'folder';
        sourceConfig = {
          path: uploadResult.upload_path, // Use the session-specific path from backend
          file_types: ['pdf', 'jpg', 'jpeg', 'png'],
          recursive: false
        };
      } else if (sourceType === 'folder') {
        if (!folderPath.trim()) {
          toast({ title: 'Please enter a folder path', variant: 'destructive' });
          return;
        }
        sourceConfig = {
          path: folderPath.trim(),
          file_types: ['pdf', 'jpg', 'jpeg', 'png'],
          recursive: true
        };
      } else if (sourceType === 'google_drive') {
        // Validate Google Drive config
        if (!googleDriveConfig.accessToken && 
            !googleDriveConfig.refreshToken &&
            !googleDriveConfig.credentialsJson && 
            !googleDriveConfig.credentialsFile && 
            !googleDriveConfig.tokenFile) {
          toast({ 
            title: 'Please sign in to Google Drive first', 
            variant: 'destructive' 
          });
          return;
        }
        
        sourceConfig = {
          access_token: googleDriveConfig.accessToken,
          refresh_token: googleDriveConfig.refreshToken,
          folder_id: googleDriveConfig.folderId || null,
          file_id: googleDriveConfig.fileId || null,
          file_name: googleDriveConfig.fileName || null,
          file_types: googleDriveConfig.fileTypes || ['application/pdf'],
          recursive: googleDriveConfig.recursive ?? true,
          shared_drive_id: googleDriveConfig.sharedDriveId
        };
        
        console.log('📤 Google Drive Config:', {
          folderId: googleDriveConfig.folderId,
          fileId: googleDriveConfig.fileId,
          fileName: googleDriveConfig.fileName
        });
      } else if (sourceType === 'onedrive') {
        // Validate OneDrive config
        if (!oneDriveConfig.accessToken && 
            !oneDriveConfig.clientSecret && 
            !oneDriveConfig.tokenFile) {
          toast({ 
            title: 'Please sign in to OneDrive first', 
            variant: 'destructive' 
          });
          return;
        }
        
        sourceConfig = {
          access_token: oneDriveConfig.accessToken,
          folder_path: oneDriveConfig.folderPath || null,
          file_types: oneDriveConfig.fileTypes || ['.pdf'],
          recursive: oneDriveConfig.recursive ?? true,
          site_id: oneDriveConfig.siteId,
          drive_id: oneDriveConfig.driveId
        };
      }

      // Create job with the API
      const jobData = {
        name: jobName.trim(),
        source_type: actualSourceType, // Use the actual source type for backend
        source_config: sourceConfig,
        processing_config: {
          mode: 'once',
          discovery_batch_size: batchSize
        },
        processing_options: {
          priority: 3,
          max_retries: maxRetries,
          parallel_workers: parallelWorkers,
          signature_detection: true,
          retry_delay: retryDelay,
          exponential_backoff: true,
          send_to_review_queue: true,
          cost_tracking: true,
          detailed_logging: false,
          // Advanced worker configuration
          worker_concurrency: workerConcurrency,
          worker_prefetch_multiplier: workerPrefetch,
          pages_per_thread: pagesPerThread,
          checkpoint_interval: checkpointInterval
        }
      };

      console.log('Creating job with data:', JSON.stringify(jobData, null, 2));
      const result = await bulkJobsApi.createJob(jobData as any);
      toast({ title: 'Job created successfully!' });

      // Start the job
      await bulkJobsApi.startJob(result.id);
      toast({ title: 'Processing started' });

      onComplete(result.id);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast({
        title: 'Failed to create job',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Create New Job</h1>
          <p className="text-muted-foreground">
            Choose your document source and configure processing
          </p>
        </div>

        {/* Job Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter a name for this job..."
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              disabled={isCreating}
            />
          </CardContent>
        </Card>

        {/* Source Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Source</CardTitle>
            <CardDescription>
              Select where your documents are stored
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  File Upload
                </TabsTrigger>
                <TabsTrigger value="folder" className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Local Folder
                </TabsTrigger>
                <TabsTrigger value="google_drive" className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Google Drive
                </TabsTrigger>
                <TabsTrigger value="onedrive" className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  OneDrive
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Upload Files</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(f => 
                        f.type === 'application/pdf' || f.type.startsWith('image/')
                      );
                      setUploadedFiles(prev => [...prev, ...files]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG files supported
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">
                        {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between">
                            <span className="truncate">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="folder" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-path">Folder Path</Label>
                  <Input
                    id="folder-path"
                    placeholder="C:\Documents\Invoices or /home/user/documents"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full path to the folder containing your documents
                  </p>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Supported File Types</h4>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, JPEG, PNG files will be automatically discovered
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="google_drive" className="mt-4">
                <CloudSourceConfigSimple
                  sourceType="google_drive"
                  config={googleDriveConfig}
                  onChange={(config) => setGoogleDriveConfig(config as Partial<GoogleDriveSourceConfig>)}
                />
              </TabsContent>

              <TabsContent value="onedrive" className="mt-4">
                <CloudSourceConfigSimple
                  sourceType="onedrive"
                  config={oneDriveConfig}
                  onChange={(config) => setOneDriveConfig(config as Partial<OneDriveSourceConfig>)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Processing Configuration */}
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-base">Processing Configuration</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Customize batch size, retries, and parallel processing
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  {/* Batch Size */}
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      min="1"
                      max="500"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Documents per discovery batch (1-500)
                    </p>
                  </div>

                  {/* Max Retries */}
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Max Retries</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      min="0"
                      max="10"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Retry attempts for failed documents (0-10)
                    </p>
                  </div>

                  {/* Parallel Workers */}
                  <div className="space-y-2">
                    <Label htmlFor="parallel-workers">Parallel Workers</Label>
                    <Input
                      id="parallel-workers"
                      type="number"
                      min="1"
                      max="50"
                      value={parallelWorkers}
                      onChange={(e) => setParallelWorkers(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Concurrent processing workers (1-50)
                    </p>
                  </div>

                  {/* Retry Delay */}
                  <div className="space-y-2">
                    <Label htmlFor="retry-delay">Retry Delay (seconds)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      min="1"
                      max="600"
                      value={retryDelay}
                      onChange={(e) => setRetryDelay(Math.max(1, Math.min(600, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Wait time before retry (1-600s)
                    </p>
                  </div>
                </div>

                {/* Advanced Worker Settings */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold mb-3">Advanced Worker Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Worker Concurrency */}
                    <div className="space-y-2">
                      <Label htmlFor="worker-concurrency">Worker Concurrency</Label>
                      <Input
                        id="worker-concurrency"
                        type="number"
                        min="1"
                        max="100"
                        value={workerConcurrency}
                        onChange={(e) => setWorkerConcurrency(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max PDFs processing simultaneously (1-100)
                      </p>
                    </div>

                    {/* Worker Prefetch */}
                    <div className="space-y-2">
                      <Label htmlFor="worker-prefetch">Worker Prefetch</Label>
                      <Input
                        id="worker-prefetch"
                        type="number"
                        min="1"
                        max="10"
                        value={workerPrefetch}
                        onChange={(e) => setWorkerPrefetch(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tasks prefetched per worker (1-10)
                      </p>
                    </div>

                    {/* Pages Per Thread */}
                    <div className="space-y-2">
                      <Label htmlFor="pages-per-thread">Pages Per Thread</Label>
                      <Input
                        id="pages-per-thread"
                        type="number"
                        min="1"
                        max="20"
                        value={pagesPerThread}
                        onChange={(e) => setPagesPerThread(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pages each thread processes (1-20)
                      </p>
                    </div>

                    {/* Checkpoint Interval */}
                    <div className="space-y-2">
                      <Label htmlFor="checkpoint-interval">Checkpoint Interval</Label>
                      <Input
                        id="checkpoint-interval"
                        type="number"
                        min="10"
                        max="500"
                        value={checkpointInterval}
                        onChange={(e) => setCheckpointInterval(Math.max(10, Math.min(500, parseInt(e.target.value) || 10)))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Save progress every N pages (10-500)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reset to Defaults */}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchSize(50);
                      setMaxRetries(3);
                      setParallelWorkers(10);
                      setRetryDelay(60);
                      setWorkerConcurrency(50);
                      setWorkerPrefetch(2);
                      setPagesPerThread(5);
                      setCheckpointInterval(50);
                      toast({ title: 'Reset to default values' });
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Configuration Summary (when collapsed) */}
        {!isConfigOpen && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Current Configuration
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Worker Concurrency:</span>
                    <span className="ml-2 font-medium">{workerConcurrency} PDFs</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Batch Size:</span>
                    <span className="ml-2 font-medium">{batchSize} docs</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pages/Thread:</span>
                    <span className="ml-2 font-medium">{pagesPerThread} pages</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Retries:</span>
                    <span className="ml-2 font-medium">{maxRetries} attempts</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Workers:</span>
                    <span className="ml-2 font-medium">{parallelWorkers} parallel</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Job Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleCreateJob}
          disabled={!jobName.trim() || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Create Job & Start Processing
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
