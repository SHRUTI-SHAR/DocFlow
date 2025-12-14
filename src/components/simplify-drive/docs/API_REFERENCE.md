# SimplifyDrive API Reference

> Complete API documentation for SimplifyDrive hooks, utilities, and services.

---

## Table of Contents

1. [Hooks API](#hooks-api)
2. [Supabase Queries](#supabase-queries)
3. [Edge Functions](#edge-functions)
4. [Utility Functions](#utility-functions)
5. [Type Definitions](#type-definitions)

---

## Hooks API

### useDocuments

Fetches and manages document data with caching and real-time updates.

```typescript
import { useDocuments } from '@/components/simplify-drive/hooks/useDocuments';

const {
  documents,   // Document[] - Array of documents
  loading,     // boolean - Loading state
  error,       // Error | null - Error if any
  stats,       // DocumentStats - Aggregated statistics
  refetch,     // () => Promise<void> - Refetch documents
} = useDocuments(options?: UseDocumentsOptions);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `folderId` | `string` | `undefined` | Filter by folder ID |
| `status` | `ProcessingStatus` | `undefined` | Filter by processing status |
| `limit` | `number` | `100` | Maximum documents to fetch |
| `realtime` | `boolean` | `false` | Enable real-time updates |

**Return Values:**

| Value | Type | Description |
|-------|------|-------------|
| `documents` | `Document[]` | Fetched documents |
| `loading` | `boolean` | True while fetching |
| `stats` | `DocumentStats` | Aggregated stats |
| `refetch` | `Function` | Manually refetch data |

**Example:**

```typescript
const { documents, loading, stats, refetch } = useDocuments({
  limit: 50,
  realtime: true
});

// Access stats
console.log(`Total: ${stats.totalDocs}, Size: ${stats.totalSize}`);

// Refresh after upload
await refetch();
```

---

### useDocumentFiltering

Provides search, filter, and sort functionality.

```typescript
import { useDocumentFiltering } from '@/components/simplify-drive/hooks/useDocumentFiltering';

const { filteredDocuments } = useDocumentFiltering({
  documents,       // Document[] - Source documents
  searchQuery,     // string - Search term
  selectedFolder,  // string - Folder filter ('all' for none)
  selectedTag,     // string - Tag filter ('all' for none)
  sortBy,          // SortField - Sort field
  sortOrder,       // 'asc' | 'desc' - Sort direction
});
```

**Sort Fields:**

| Field | Description |
|-------|-------------|
| `'name'` | Alphabetical by filename |
| `'created_at'` | By creation date |
| `'updated_at'` | By last modification |
| `'size'` | By file size |
| `'importance'` | By AI importance score |

**Example:**

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState<SortField>('created_at');
const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

const { filteredDocuments } = useDocumentFiltering({
  documents,
  searchQuery,
  selectedFolder: 'all',
  selectedTag: 'all',
  sortBy,
  sortOrder,
});
```

---

### useQuickAccess

Manages quick access/pinned documents.

```typescript
import { useQuickAccess } from '@/hooks/useQuickAccess';

const {
  items,           // QuickAccessItem[] - Quick access items
  loading,         // boolean
  addItem,         // (documentId: string, priority?: Priority) => Promise<void>
  removeItem,      // (documentId: string) => Promise<void>
  updatePriority,  // (documentId: string, priority: Priority) => Promise<void>
  reorderItems,    // (items: QuickAccessItem[]) => Promise<void>
} = useQuickAccess();
```

**Priority Levels:**

```typescript
type Priority = 'high' | 'medium' | 'low';
```

**Example:**

```typescript
const { items, addItem, removeItem } = useQuickAccess();

// Pin a document
await addItem(documentId, 'high');

// Unpin
await removeItem(documentId);
```

---

### useFavorites

Manages starred/favorite documents.

```typescript
import { useFavorites } from '@/hooks/useFavorites';

const {
  favorites,       // FavoriteItem[] - Favorited documents
  loading,
  isFavorite,      // (documentId: string) => boolean
  addFavorite,     // (documentId: string, options?: FavoriteOptions) => Promise<void>
  removeFavorite,  // (documentId: string) => Promise<void>
  updateFavorite,  // (documentId: string, updates: Partial<FavoriteOptions>) => Promise<void>
} = useFavorites();
```

**Favorite Options:**

```typescript
interface FavoriteOptions {
  color?: string;    // Custom star color
  notes?: string;    // User notes
  priority?: number; // Sort priority
}
```

---

### useDocumentShare

Manages document sharing.

```typescript
import { useDocumentShare } from '@/hooks/useDocumentShare';

const {
  shares,          // ShareItem[] - Active shares for document
  loading,
  createShare,     // (config: ShareConfig) => Promise<ShareResult>
  updateShare,     // (shareId: string, updates: Partial<ShareConfig>) => Promise<void>
  revokeShare,     // (shareId: string) => Promise<void>
  getShareLink,    // (shareId: string) => string
} = useDocumentShare(documentId);
```

**Share Configuration:**

```typescript
interface ShareConfig {
  shareType: 'link' | 'email' | 'user';
  accessLevel: 'view' | 'comment' | 'edit' | 'admin';
  
  // For user/email shares
  sharedWith?: string;    // User ID or email
  
  // Link settings
  password?: string;
  expiresAt?: Date;
  downloadAllowed?: boolean;
  maxDownloads?: number;
  applyWatermark?: boolean;
}
```

**Example:**

```typescript
const { createShare, getShareLink } = useDocumentShare(documentId);

// Create a password-protected link
const share = await createShare({
  shareType: 'link',
  accessLevel: 'view',
  password: 'secret123',
  expiresAt: new Date('2024-12-31'),
  downloadAllowed: false,
});

const shareUrl = getShareLink(share.id);
```

---

### useDocumentCheckout

Manages check-in/check-out locking.

```typescript
import { useDocumentCheckout } from '@/hooks/useDocumentCheckout';

const {
  checkout,        // CheckoutInfo | null - Current checkout
  isCheckedOut,    // boolean
  isCheckedOutByMe,// boolean
  checkOut,        // (options?: CheckoutOptions) => Promise<void>
  checkIn,         // (options?: CheckinOptions) => Promise<void>
  forceCheckIn,    // (reason: string) => Promise<void>
} = useDocumentCheckout(documentId);
```

**Checkout Options:**

```typescript
interface CheckoutOptions {
  reason?: string;
  expectedDuration?: number;  // Minutes
  notifyOnCheckin?: boolean;
}

interface CheckinOptions {
  comment?: string;
  createVersion?: boolean;
  versionType?: 'major' | 'minor';
}
```

---

### useDocumentVersions

Manages version history.

```typescript
import { useDocumentVersions } from '@/hooks/useDocumentVersions';

const {
  versions,        // Version[] - Version history
  loading,
  currentVersion,  // Version - Current/latest version
  createVersion,   // (options: VersionOptions) => Promise<Version>
  restoreVersion,  // (versionId: string) => Promise<void>
  compareVersions, // (v1: string, v2: string) => Promise<DiffResult>
  deleteVersion,   // (versionId: string) => Promise<void>
} = useDocumentVersions(documentId);
```

---

### useCustomMetadata

Manages custom metadata fields.

```typescript
import { useCustomMetadata } from '@/hooks/useCustomMetadata';

const {
  fields,          // MetadataField[] - Field definitions
  loading,
  createField,     // (field: FieldDefinition) => Promise<MetadataField>
  updateField,     // (fieldId: string, updates: Partial<FieldDefinition>) => Promise<void>
  deleteField,     // (fieldId: string) => Promise<void>
  getDocumentMetadata,   // (documentId: string) => Record<string, any>
  setDocumentMetadata,   // (documentId: string, metadata: Record<string, any>) => Promise<void>
} = useCustomMetadata();
```

---

### useWatermark

Manages watermark configurations.

```typescript
import { useWatermark } from '@/hooks/useWatermark';

const {
  configs,         // WatermarkConfig[] - Saved configurations
  defaultConfig,   // WatermarkConfig | null
  createConfig,    // (config: WatermarkConfig) => Promise<void>
  updateConfig,    // (configId: string, updates: Partial<WatermarkConfig>) => Promise<void>
  deleteConfig,    // (configId: string) => Promise<void>
  setDefault,      // (configId: string) => Promise<void>
  applyWatermark,  // (documentId: string, configId?: string) => Promise<string> - Returns watermarked URL
} = useWatermark();
```

---

### useMigration

Manages document migration from external sources.

```typescript
import { useMigration } from '@/hooks/useMigration';

const {
  jobs,            // MigrationJob[] - All migration jobs
  activeJob,       // MigrationJob | null - Currently running
  startMigration,  // (config: MigrationConfig) => Promise<MigrationJob>
  pauseMigration,  // (jobId: string) => Promise<void>
  resumeMigration, // (jobId: string) => Promise<void>
  cancelMigration, // (jobId: string) => Promise<void>
  getJobStatus,    // (jobId: string) => MigrationStatus
} = useMigration();
```

**Migration Configuration:**

```typescript
interface MigrationConfig {
  sourceType: 'google_drive' | 'onedrive' | 'sharepoint' | 'filenet';
  credentials: SourceCredentials;
  options: {
    preserveFolderStructure: boolean;
    preserveMetadata: boolean;
    handleDuplicates: 'skip' | 'rename' | 'overwrite';
    targetFolderId?: string;
  };
}
```

---

### useProcessingPipeline

Monitors document processing queue.

```typescript
import { useProcessingPipeline } from '@/hooks/useProcessingPipeline';

const {
  queue,           // ProcessingItem[] - Items in queue
  processing,      // ProcessingItem[] - Currently processing
  completed,       // ProcessingItem[] - Recently completed
  failed,          // ProcessingItem[] - Failed items
  stats,           // QueueStats
  retryItem,       // (itemId: string) => Promise<void>
  cancelItem,      // (itemId: string) => Promise<void>
  clearCompleted,  // () => Promise<void>
} = useProcessingPipeline();
```

---

## Supabase Queries

### Document CRUD

```typescript
import { supabase } from '@/integrations/supabase/client';

// Fetch documents
const fetchDocuments = async (userId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Create document
const createDocument = async (document: DocumentInsert) => {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single();
  
  return { data, error };
};

// Update document
const updateDocument = async (id: string, updates: DocumentUpdate) => {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
};

// Soft delete
const deleteDocument = async (id: string) => {
  const { error } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  
  return { error };
};
```

### File Upload

```typescript
// Upload to storage
const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  return { data, error };
};

// Get public URL
const getPublicUrl = (path: string) => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Get signed URL (for private files)
const getSignedUrl = async (path: string, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, expiresIn);
  
  return { url: data?.signedUrl, error };
};
```

### Real-time Subscriptions

```typescript
// Subscribe to document changes
const subscribeToDocuments = (userId: string, callback: (doc: Document) => void) => {
  const subscription = supabase
    .channel('documents-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Document);
      }
    )
    .subscribe();
  
  return () => subscription.unsubscribe();
};
```

---

## Edge Functions

### process-document

Processes uploaded documents (OCR, classification, indexing).

```typescript
// Invoke
const { data, error } = await supabase.functions.invoke('process-document', {
  body: {
    documentId: 'uuid',
    options: {
      extractText: true,
      classify: true,
      generateThumbnail: true,
      indexForSearch: true,
    }
  }
});

// Response
interface ProcessResult {
  success: boolean;
  extractedText?: string;
  documentType?: string;
  confidence?: number;
  thumbnailUrl?: string;
  processingTimeMs: number;
}
```

### generate-summary

Generates AI summaries for documents.

```typescript
const { data, error } = await supabase.functions.invoke('generate-summary', {
  body: {
    documentId: 'uuid',
    summaryType: 'executive', // 'executive' | 'detailed' | 'key_points' | 'action_items'
    language: 'en',
    maxLength: 500,
  }
});

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  confidence: number;
}
```

### semantic-search

Performs vector similarity search.

```typescript
const { data, error } = await supabase.functions.invoke('semantic-search', {
  body: {
    query: 'contracts expiring next month',
    limit: 10,
    threshold: 0.7,
    filters: {
      documentType: 'contract',
      createdAfter: '2024-01-01',
    }
  }
});

interface SearchResult {
  documents: Array<{
    id: string;
    name: string;
    similarity: number;
    snippet: string;
  }>;
  totalResults: number;
}
```

### apply-watermark

Applies watermark to document.

```typescript
const { data, error } = await supabase.functions.invoke('apply-watermark', {
  body: {
    documentId: 'uuid',
    watermarkConfigId: 'uuid', // or inline config
    outputFormat: 'pdf',
  }
});

interface WatermarkResult {
  watermarkedUrl: string;
  expiresAt: string;
}
```

---

## Utility Functions

### File Utilities

```typescript
// src/components/simplify-drive/utils/fileUtils.ts

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// Get file icon
export const getFileIcon = (mimeType: string): IconType => {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType === 'application/pdf') return FileTextIcon;
  if (mimeType.includes('spreadsheet')) return TableIcon;
  // ... more mappings
  return FileIcon;
};

// Generate unique filename
export const generateUniqueFilename = (original: string): string => {
  const ext = getFileExtension(original);
  const name = original.slice(0, -(ext.length + 1));
  const timestamp = Date.now();
  return `${name}_${timestamp}.${ext}`;
};
```

### Date Utilities

```typescript
// src/components/simplify-drive/utils/dateUtils.ts

// Relative time
export const getRelativeTime = (date: string | Date): string => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = Date.now() - new Date(date).getTime();
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  
  const months = Math.floor(days / 30);
  return rtf.format(-months, 'month');
};

// Format date
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string => {
  if (format === 'relative') return getRelativeTime(date);
  
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString();
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
```

### Search Utilities

```typescript
// src/components/simplify-drive/utils/searchUtils.ts

// Highlight search matches
export const highlightMatches = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part
  );
};

// Parse search query
export const parseSearchQuery = (query: string): SearchQuery => {
  const filters: Record<string, string> = {};
  let textQuery = query;
  
  // Parse type:value patterns
  const filterRegex = /(\w+):(\S+)/g;
  let match;
  
  while ((match = filterRegex.exec(query)) !== null) {
    filters[match[1]] = match[2];
    textQuery = textQuery.replace(match[0], '');
  }
  
  return {
    text: textQuery.trim(),
    filters,
  };
};
```

---

## Type Definitions

### Core Types

```typescript
// src/components/simplify-drive/types/index.ts

export interface Document {
  id: string;
  user_id: string;
  name: string;
  original_name?: string;
  file_path?: string;
  storage_path?: string;
  storage_url?: string;
  mime_type?: string;
  document_type?: string;
  file_size: number;
  extracted_text?: string;
  processing_status: ProcessingStatus;
  ai_summary?: string;
  importance_score?: number;
  metadata: Record<string, any>;
  custom_fields?: Record<string, any>;
  parent_folder_id?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type ProcessingStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ViewMode = 'grid' | 'list';

export type SortField = 'name' | 'created_at' | 'updated_at' | 'size' | 'importance';

export type SortOrder = 'asc' | 'desc';

export interface DocumentStats {
  totalDocs: number;
  processedDocs: number;
  totalSize: string;
  avgImportance: string;
}

export interface SmartFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  path?: string;
  rules: FolderRule[];
  is_smart: boolean;
  is_system: boolean;
  document_count: number;
  total_size: number;
  created_at: string;
  updated_at: string;
}

export interface FolderRule {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between' | 'in';
  value: string | number | string[];
}

export interface DocumentTag {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  is_ai_suggested: boolean;
  confidence_score?: number;
  usage_count: number;
  created_at: string;
}
```

### Feature Types

```typescript
export interface ShareConfig {
  shareType: 'link' | 'email' | 'user' | 'group';
  accessLevel: 'view' | 'comment' | 'edit' | 'admin';
  sharedWith?: string;
  password?: string;
  expiresAt?: Date;
  downloadAllowed?: boolean;
  printAllowed?: boolean;
  maxDownloads?: number;
  maxViews?: number;
  applyWatermark?: boolean;
  watermarkConfigId?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  version_type: 'major' | 'minor' | 'auto';
  storage_path: string;
  file_size: number;
  checksum?: string;
  change_summary?: string;
  ai_diff_summary?: string;
  created_by: string;
  created_at: string;
  is_current: boolean;
}

export interface WatermarkConfig {
  id: string;
  name: string;
  watermark_type: 'text' | 'image' | 'dynamic';
  text_content?: string;
  font_family?: string;
  font_size?: number;
  font_color?: string;
  opacity?: number;
  position?: 'center' | 'diagonal' | 'tile' | 'custom';
  rotation?: number;
  include_username?: boolean;
  include_date?: boolean;
  include_email?: boolean;
  image_url?: string;
  is_default?: boolean;
}

export interface MigrationJob {
  id: string;
  source_type: 'google_drive' | 'onedrive' | 'sharepoint' | 'filenet';
  status: MigrationStatus;
  total_files: number;
  processed_files: number;
  failed_files: number;
  total_bytes: number;
  processed_bytes: number;
  started_at?: string;
  completed_at?: string;
  errors: MigrationError[];
}

export type MigrationStatus = 
  | 'pending'
  | 'connecting'
  | 'scanning'
  | 'migrating'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

---

*API Version: 1.0.0 | Last Updated: December 2024*
