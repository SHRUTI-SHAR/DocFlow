/**
 * Type definitions for bulk document processing system
 */

export type ProcessingMode = 'single' | 'bulk';

export type SourceType = 'folder' | 'database' | 'cloud' | 'google_drive' | 'onedrive';

export type ProcessingModeType = 'once' | 'continuous';

export type BulkJobStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'paused' 
  | 'stopped';

export type DocumentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface FolderSourceConfig {
  type: 'folder';
  path: string;
  fileTypes?: string[]; // ['pdf', 'jpg', 'png']
  recursive?: boolean;
  maxFileSize?: number; // in bytes
}

export interface DatabaseSourceConfig {
  type: 'database';
  query?: string;
  table?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CloudSourceConfig {
  type: 'cloud';
  provider: 's3' | 'gcs' | 'azure';
  bucket: string;
  pathPrefix?: string;
  credentials?: Record<string, string>;
  filePattern?: string;
}

export interface GoogleDriveSourceConfig {
  type: 'google_drive';
  accessToken?: string; // Direct access token from frontend OAuth
  refreshToken?: string; // Refresh token for long-term access
  folderId?: string; // If null, searches entire drive
  fileId?: string; // For single file selection instead of folder
  fileName?: string; // Name of selected file
  credentialsJson?: string; // Legacy: Service account credentials as JSON string
  credentialsFile?: string; // Legacy: Path to credentials file
  tokenFile?: string; // Legacy: Path to token file for OAuth
  fileTypes?: string[]; // MIME types like 'application/pdf'
  recursive?: boolean;
  sharedDriveId?: string; // For shared/team drives
}

export interface OneDriveSourceConfig {
  type: 'onedrive';
  accessToken?: string; // Direct access token from frontend OAuth
  folderPath?: string; // If null, searches entire drive root
  clientId?: string; // Legacy: Azure AD application client ID
  clientSecret?: string; // Legacy: For client credentials flow
  tenantId?: string; // Legacy: Azure AD tenant ID
  tokenFile?: string; // Legacy: Path to token file for OAuth
  fileTypes?: string[]; // File extensions like '.pdf'
  recursive?: boolean;
  siteId?: string; // For SharePoint sites
  driveId?: string; // Specific drive ID
}

export type SourceConfig = 
  | FolderSourceConfig 
  | DatabaseSourceConfig 
  | CloudSourceConfig
  | GoogleDriveSourceConfig
  | OneDriveSourceConfig;

export interface ProcessingConfig {
  mode: ProcessingModeType; // 'once' = process all found documents once, 'continuous' = keep scanning for new files
  batchSize: number; // How many documents to discover/queue from source per scan cycle
  // Note: batchSize controls discovery/queuing, parallelWorkers (in ProcessingOptions) controls concurrent processing
}

export interface ProcessingOptions {
  priority: number; // 1-5
  maxRetries: number; // 1-10
  enableSignatureDetection: boolean;
  parallelWorkers: number; // 1-50
  rateLimitPerMinute?: number;
  retryDelay?: number; // seconds
  exponentialBackoff?: boolean;
  sendToReviewAfterMaxRetries?: boolean;
  customModel?: string;
  processingTimeout?: number; // seconds
  enableCostTracking?: boolean;
  enableDetailedLogging?: boolean;
}

export interface NotificationPreferences {
  dashboardNotifications: boolean; // always true
  completionAlerts: boolean;
  errorAlerts: boolean;
  summaryReports?: 'daily' | 'weekly' | 'none';
}

export interface BulkJobConfig {
  source: SourceConfig;
  processing: ProcessingConfig;
  processingOptions: ProcessingOptions;
  notifications: NotificationPreferences;
}

export interface BulkJob {
  id: string;
  name: string;
  config: BulkJobConfig;
  status: BulkJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  documentsNeedingReview?: number;
  progress: number; // 0-100
  estimatedCompletionTime?: string;
}

export interface BulkJobDocument {
  id: string;
  jobId: string;
  name: string;
  status: DocumentStatus;
  processingTime?: number; // milliseconds
  extractedFieldsCount?: number;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}

export interface BulkStatistics {
  totalProcessedToday: number;
  totalProcessedWeek: number;
  totalProcessedMonth: number;
  successRate: number; // 0-100
  averageProcessingTime: number; // milliseconds
  totalCost?: number; // in INR
  documentsInReviewQueue: number;
}

export interface ReviewQueueItem {
  id: string;
  documentId: string;
  jobId: string;
  documentName: string;
  jobName?: string;
  errorType: string;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  failedAt: string;
  priority: number; // 1-5
  notes?: string;
  // Backend fields
  reason?: string;
  status?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt?: string;
}

export interface BulkJobCreateRequest {
  name: string;
  config: BulkJobConfig;
}

export interface BulkJobUpdateRequest {
  name?: string;
  config?: Partial<BulkJobConfig>;
  status?: BulkJobStatus;
}

