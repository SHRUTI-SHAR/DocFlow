# SimplifyDrive - Developer Documentation

> A comprehensive, cloud-scale document management platform built to compete with SharePoint, Google Drive, and enterprise DMS solutions.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Structure](#module-structure)
4. [Features](#features)
5. [AI Capabilities](#ai-capabilities)
6. [Database Schema](#database-schema)
7. [Hooks Reference](#hooks-reference)
8. [Components Reference](#components-reference)
9. [State Management](#state-management)
10. [Performance & Scalability](#performance--scalability)
11. [Extending SimplifyDrive](#extending-simplifydrive)

---

## Overview

SimplifyDrive is a modular, production-ready document management system designed to handle millions of documents with enterprise-grade features including:

- **Document Management**: Upload, organize, search, and manage documents
- **AI-Powered Features**: Smart summaries, auto-tagging, semantic search
- **Collaboration**: Sharing, check-in/check-out, workflows
- **Compliance**: Retention policies, legal holds, audit trails
- **Migration**: Import from Google Drive, OneDrive, FileNet

### Key Differentiators

| Feature | SimplifyDrive | SharePoint | Google Drive |
|---------|---------------|------------|--------------|
| AI Template Creation | ✅ | ❌ | ❌ |
| Visual Workflow Builder | ✅ | Partial | ❌ |
| Zero-Code Form Generation | ✅ | ❌ | ❌ |
| Document-to-Form Conversion | ✅ | ❌ | ❌ |
| Visual API/Webhook Builder | ✅ | ❌ | ❌ |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SimplifyDrive                             │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer (React + TypeScript)                                  │
│  ├── SimplifyDrive.tsx (Main Entry)                             │
│  ├── FeatureNavigation (Tab System)                             │
│  ├── DocumentsView (Grid/List Views)                            │
│  └── FeatureContent (Feature Dashboards)                        │
├─────────────────────────────────────────────────────────────────┤
│  State Management Layer                                          │
│  ├── useDocuments (Data Fetching)                               │
│  ├── useDocumentFiltering (Search/Sort)                         │
│  ├── useLocalStorage (Persistence)                              │
│  └── React Query (Server State)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                            │
│  ├── Document Processing Pipeline                               │
│  ├── AI Services (Summaries, Tags, Search)                      │
│  ├── Workflow Engine                                            │
│  └── Migration Services                                         │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (Supabase)                                          │
│  ├── PostgreSQL (Metadata, Permissions)                         │
│  ├── Storage Buckets (Binary Content)                           │
│  ├── Edge Functions (Processing)                                │
│  └── Vector Store (RAG/Semantic Search)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Cloud-Scale Design Patterns

1. **Separation of Concerns**
   - Binary content → S3/Object Storage
   - Metadata/Permissions → PostgreSQL
   - Search indexes → Vector Store

2. **Asynchronous Processing**
   - Document processing via queue
   - OCR, classification, indexing as background jobs
   - Real-time status updates via subscriptions

3. **Cursor-Based Pagination**
   - Efficient pagination for large datasets
   - Virtual scrolling for UI performance
   - Infinite scroll support

4. **Permission Caching**
   - Per-user/folder permission cache
   - Avoids expensive joins on read
   - Invalidation on permission changes

---

## Module Structure

```
src/components/simplify-drive/
├── index.ts                    # Public exports
├── SimplifyDrive.tsx           # Main component
├── README.md                   # This documentation
│
├── components/
│   ├── FeatureNavigation.tsx   # Horizontal tab navigation
│   ├── SimplifyDriveHeader.tsx # Header with stats & actions
│   ├── DocumentsView.tsx       # Document grid/list view
│   ├── FeatureContent.tsx      # Feature dashboard router
│   └── DocumentModals.tsx      # Modal dialogs
│
├── hooks/
│   ├── useDocuments.ts         # Document fetching & CRUD
│   └── useDocumentFiltering.ts # Search, filter, sort logic
│
├── constants/
│   └── featureTabs.ts          # Feature tab configuration
│
└── types/
    └── index.ts                # TypeScript interfaces
```

---

## Features

### Core Features (25+)

| Category | Features |
|----------|----------|
| **Documents** | Upload, Download, Preview, Grid/List View, Folders |
| **Organization** | Smart Folders, Tags, Quick Access, Favorites |
| **Sharing** | Share Links, Guest Sharing, Access Rules |
| **Collaboration** | Check-In/Out, Workflows, Comments |
| **AI** | Summaries, Auto-Tagging, Semantic Search |
| **Compliance** | Retention, Legal Hold, Audit Trail |
| **Advanced** | Watermarks, Metadata, Version Compare |
| **Migration** | Google Drive, OneDrive, FileNet Import |

### Feature Tabs Configuration

Features are configured in `constants/featureTabs.ts`:

```typescript
export const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    description: 'Manage all your documents',
    category: 'core'
  },
  // ... more features
];
```

### Adding New Features

1. Add tab configuration to `featureTabs.ts`
2. Create feature component in `src/components/[feature-name]/`
3. Register in `FeatureContent.tsx` switch statement
4. Add required hooks/state management

---

## AI Capabilities

### AI-Powered Features

| Feature | Description | API/Service |
|---------|-------------|-------------|
| **Document Summaries** | Generate executive summaries | Edge Function |
| **Auto-Tagging** | Suggest tags based on content | ML Classification |
| **Semantic Search** | Natural language document search | Vector Embeddings |
| **Smart Folders** | Auto-organize by content type | Rule Engine + AI |
| **Content Extraction** | OCR + structured data extraction | Vision AI |
| **Recommendations** | Suggest related documents | Similarity Search |

### AI Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AI Services                        │
├─────────────────────────────────────────────────────┤
│  Document Processing Pipeline                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ Upload  │→ │  OCR    │→ │Classify │→ │ Index   ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘│
├─────────────────────────────────────────────────────┤
│  Vector Store (RAG)                                  │
│  ├── Document Embeddings (1536 dimensions)          │
│  ├── Semantic Search                                │
│  └── Similarity Matching                            │
├─────────────────────────────────────────────────────┤
│  LLM Services                                        │
│  ├── Summary Generation                             │
│  ├── Q&A over Documents                             │
│  └── Content Analysis                               │
└─────────────────────────────────────────────────────┘
```

### Enabling RAG Integration

Documents are optionally stored in the vector database:

```typescript
// During upload, enable RAG via checkbox
const handleUpload = async (file: File, enableRAG: boolean) => {
  const doc = await uploadDocument(file);
  
  if (enableRAG) {
    await indexForSemanticSearch(doc.id);
  }
};
```

---

## Database Schema

### Core Tables

#### `documents`
Primary document metadata storage.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT,
  storage_path TEXT,
  mime_type TEXT,
  document_type TEXT,
  file_size BIGINT,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(extracted_text, ''))
  ) STORED
);

-- Indexes for performance
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_type ON documents(document_type);
```

#### `smart_folders`
AI-organized folder structure.

```sql
CREATE TABLE smart_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  rules JSONB DEFAULT '[]',
  document_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `document_tags`
Tagging system for organization.

```sql
CREATE TABLE document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366F1',
  is_ai_suggested BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `document_shares`
Sharing and permission management.

```sql
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  share_type TEXT NOT NULL, -- 'link', 'email', 'user'
  access_level TEXT DEFAULT 'view', -- 'view', 'edit', 'admin'
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  download_allowed BOOLEAN DEFAULT true,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `document_versions` | Version history tracking |
| `document_checkouts` | Check-in/check-out locking |
| `document_workflows` | Workflow definitions |
| `workflow_instances` | Running workflow state |
| `document_summaries` | AI-generated summaries |
| `document_favorites` | User favorites/stars |
| `quick_access_items` | Quick access priorities |
| `watermark_configs` | Watermark templates |
| `custom_metadata_fields` | Custom field definitions |
| `ownership_transfers` | Transfer requests |
| `migration_jobs` | Migration tracking |

---

## Hooks Reference

### `useDocuments`

Fetches and manages document data.

```typescript
import { useDocuments } from './hooks/useDocuments';

const { 
  documents,    // Document[]
  loading,      // boolean
  stats,        // { totalDocs, processedDocs, totalSize, avgImportance }
  refetch       // () => Promise<void>
} = useDocuments();
```

### `useDocumentFiltering`

Handles search, filter, and sort operations.

```typescript
import { useDocumentFiltering } from './hooks/useDocumentFiltering';

const { filteredDocuments } = useDocumentFiltering({
  documents,
  searchQuery,
  selectedFolder,
  selectedTag,
  sortBy,      // 'name' | 'created_at' | 'size' | 'importance'
  sortOrder    // 'asc' | 'desc'
});
```

### Additional Hooks (External)

| Hook | Location | Purpose |
|------|----------|---------|
| `useQuickAccess` | `@/hooks/useQuickAccess` | Quick access management |
| `useCustomMetadata` | `@/hooks/useCustomMetadata` | Custom field CRUD |
| `useWatermark` | `@/hooks/useWatermark` | Watermark configuration |
| `useOwnershipTransfer` | `@/hooks/useOwnershipTransfer` | Transfer workflows |
| `useMigration` | `@/hooks/useMigration` | Migration job management |
| `useProcessingPipeline` | `@/hooks/useProcessingPipeline` | Processing queue |
| `useCursorPagination` | `@/hooks/useCursorPagination` | Cursor-based pagination |
| `useVirtualScroll` | `@/hooks/useVirtualScroll` | Virtual list rendering |
| `useInfiniteScroll` | `@/hooks/useInfiniteScroll` | Infinite scroll loading |

---

## Components Reference

### SimplifyDrive (Main Entry)

```typescript
import { SimplifyDrive } from '@/components/simplify-drive';

// Usage
<SimplifyDrive />
```

### FeatureNavigation

Horizontal scrollable tab navigation.

```typescript
<FeatureNavigation 
  activeFeature={activeFeature}      // string
  onFeatureChange={setActiveFeature} // (id: string) => void
/>
```

### SimplifyDriveHeader

Header with stats, search, and actions.

```typescript
<SimplifyDriveHeader
  stats={stats}
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  sortBy={sortBy}
  onSortByChange={setSortBy}
  sortOrder={sortOrder}
  onSortOrderChange={setSortOrder}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  aiInsightsEnabled={aiInsightsEnabled}
  onAiInsightsToggle={toggleAiInsights}
  onUpload={handleUpload}
  onScan={handleScan}
  isOnline={isOnline}
/>
```

### DocumentsView

Document display in grid or list format.

```typescript
<DocumentsView
  documents={filteredDocuments}
  viewMode={viewMode}                    // 'grid' | 'list'
  aiInsightsEnabled={aiInsightsEnabled}
  selectedFolder={selectedFolder}
  onFolderSelect={setSelectedFolder}
  onDocumentClick={handleViewDocument}
/>
```

### FeatureContent

Routes to feature-specific dashboards.

```typescript
<FeatureContent
  activeFeature={activeFeature}
  documents={documents}
  onViewDocument={handleViewDocument}
  onDownloadDocument={handleDownloadDocument}
/>
```

---

## State Management

### Local State (useState)

- UI state (modals, active tabs, view mode)
- Form inputs (search query, filters)
- Temporary selections

### Persisted State (useLocalStorage)

- User preferences (view mode, AI settings)
- Last active feature
- Collapsed/expanded panels

### Server State (React Query / Supabase)

- Document data
- User settings
- Real-time subscriptions

### State Flow

```
User Action → Local State Update → API Call → Server State → UI Update
                     ↓
              Optimistic Update (optional)
```

---

## Performance & Scalability

### Design for Millions of Documents

1. **Cursor-Based Pagination**
   ```typescript
   const { data, fetchNextPage } = useCursorPagination({
     table: 'documents',
     pageSize: 50,
     orderBy: 'created_at'
   });
   ```

2. **Virtual Scrolling**
   ```typescript
   const { virtualItems, totalSize } = useVirtualScroll({
     items: documents,
     itemHeight: 80,
     containerHeight: 600
   });
   ```

3. **Optimized Queries**
   ```sql
   -- Use composite indexes
   CREATE INDEX idx_docs_tenant_folder 
   ON documents(tenant_id, parent_folder_id, name);
   
   -- Cursor-based query
   SELECT * FROM documents
   WHERE tenant_id = $1 
     AND created_at < $cursor
   ORDER BY created_at DESC
   LIMIT 50;
   ```

4. **Async Processing**
   - Heavy operations (OCR, indexing) run in background
   - Real-time status updates via subscriptions
   - Queue-based processing with retries

### Performance Targets

| Metric | Target |
|--------|--------|
| Folder listing | < 200ms |
| Document download (via CDN) | < 500ms |
| Search latency | < 1s |
| Upload + processing start | < 2s |

---

## Extending SimplifyDrive

### Adding a New Feature

1. **Define the Feature Tab**

```typescript
// constants/featureTabs.ts
{
  id: 'my-feature',
  label: 'My Feature',
  icon: MyIcon,
  description: 'Description here',
  category: 'advanced',
  badge: 'New'
}
```

2. **Create Feature Component**

```typescript
// src/components/my-feature/MyFeatureDashboard.tsx
export const MyFeatureDashboard: React.FC<Props> = ({ documents }) => {
  // Feature implementation
};
```

3. **Register in FeatureContent**

```typescript
// components/FeatureContent.tsx
case 'my-feature':
  return <MyFeatureDashboard documents={documents} />;
```

4. **Add Required Hooks**

```typescript
// hooks/useMyFeature.ts
export const useMyFeature = () => {
  // Hook implementation
};
```

### Adding Database Tables

```sql
-- Create migration via Supabase
CREATE TABLE public.my_feature_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  document_id UUID REFERENCES documents,
  -- ... fields
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.my_feature_data ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage own data"
ON public.my_feature_data
FOR ALL USING (auth.uid() = user_id);
```

### Integrating AI Services

```typescript
// Use Supabase Edge Functions
const response = await supabase.functions.invoke('my-ai-function', {
  body: { documentId, action: 'analyze' }
});
```

---

## API Reference

### Supabase Client

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query documents
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Upload file
const { data, error } = await supabase.storage
  .from('documents')
  .upload(path, file);

// Call Edge Function
const { data, error } = await supabase.functions
  .invoke('process-document', { body: { documentId } });
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `process-document` | OCR, extraction, classification |
| `generate-summary` | AI document summary |
| `semantic-search` | Vector similarity search |
| `migrate-documents` | Import from external sources |

---

## Testing

### Unit Tests

```bash
# Run component tests
npm run test src/components/simplify-drive
```

### Integration Tests

```bash
# Run with Supabase local
npm run test:integration
```

### E2E Tests

```bash
# Run Playwright tests
npm run test:e2e
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Documents not loading | Check RLS policies, user auth |
| Upload fails | Verify storage bucket permissions |
| Search not working | Ensure search_vector index exists |
| Slow performance | Check pagination, add indexes |

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('simplify_drive_debug', 'true');
```

---

## Contributing

1. Follow existing code patterns
2. Add TypeScript types for all new code
3. Include unit tests for hooks/utilities
4. Update this documentation
5. Submit PR with description

---

## License

Proprietary - All Rights Reserved

---

*Last updated: December 2024*
