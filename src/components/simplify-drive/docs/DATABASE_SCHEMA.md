# SimplifyDrive Database Schema

> Complete database schema reference for the SimplifyDrive document management platform.

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    documents    │       │  smart_folders  │
│  (auth.users)   │◄──────│                 │───────►│                 │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
        │                          │                         │
        │                          │                         │
        ▼                          ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ user_profiles   │       │document_versions│       │folder_documents │
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                          │
        │                          │
        ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│document_shares  │       │document_checkouts│      │document_tags    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                          │                         │
        │                          │                         │
        ▼                          ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ share_links     │       │document_workflows│      │document_tag_map │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Core Tables

### documents

Primary table storing document metadata.

```sql
CREATE TABLE public.documents (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id UUID REFERENCES auth.users NOT NULL,
  uploaded_by UUID REFERENCES auth.users,
  
  -- File Information
  name TEXT NOT NULL,
  original_name TEXT,
  file_path TEXT,
  storage_path TEXT,
  mime_type TEXT,
  document_type TEXT,
  file_size BIGINT DEFAULT 0,
  
  -- Content & Processing
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  -- Values: 'pending', 'processing', 'completed', 'failed'
  
  -- AI-Generated
  ai_summary TEXT,
  ai_tags JSONB DEFAULT '[]',
  importance_score NUMERIC(3,2),
  
  -- Organization
  parent_folder_id UUID REFERENCES smart_folders,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  
  -- Search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(extracted_text, ''))
  ) STORED,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_folder ON documents(parent_folder_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);
```

**Column Descriptions:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique document identifier |
| `user_id` | UUID | Owner of the document |
| `name` | TEXT | Display name (cleaned) |
| `original_name` | TEXT | Original uploaded filename |
| `storage_path` | TEXT | Path in Supabase Storage |
| `mime_type` | TEXT | MIME type (e.g., 'application/pdf') |
| `document_type` | TEXT | Classified type (e.g., 'invoice', 'contract') |
| `extracted_text` | TEXT | OCR/extracted text content |
| `processing_status` | TEXT | Current processing state |
| `ai_summary` | TEXT | AI-generated summary |
| `importance_score` | NUMERIC | AI-calculated importance (0-1) |
| `metadata` | JSONB | Flexible metadata storage |
| `search_vector` | TSVECTOR | Full-text search index |

---

### smart_folders

AI-organized folder structure.

```sql
CREATE TABLE public.smart_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Folder Info
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  
  -- Hierarchy
  parent_id UUID REFERENCES smart_folders,
  path TEXT, -- Materialized path: '/root/parent/child'
  depth INTEGER DEFAULT 0,
  
  -- Smart Rules
  rules JSONB DEFAULT '[]',
  -- Example: [{"field": "document_type", "operator": "equals", "value": "invoice"}]
  
  is_smart BOOLEAN DEFAULT false, -- Auto-populated by rules
  is_system BOOLEAN DEFAULT false, -- System-created, non-deletable
  
  -- Stats
  document_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_folders_user ON smart_folders(user_id);
CREATE INDEX idx_folders_parent ON smart_folders(parent_id);
CREATE INDEX idx_folders_path ON smart_folders(path);
```

**Smart Folder Rules Schema:**

```json
{
  "rules": [
    {
      "field": "document_type",
      "operator": "equals",
      "value": "invoice"
    },
    {
      "field": "created_at",
      "operator": "within",
      "value": "30d"
    }
  ],
  "match": "all" // or "any"
}
```

---

### document_versions

Version history tracking.

```sql
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  
  -- Version Info
  version_number INTEGER NOT NULL,
  version_type TEXT DEFAULT 'minor', -- 'major', 'minor', 'auto'
  
  -- Storage
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  checksum TEXT,
  
  -- Changes
  change_summary TEXT,
  ai_diff_summary TEXT,
  changes JSONB DEFAULT '{}',
  
  -- Creator
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Status
  is_current BOOLEAN DEFAULT false,
  
  UNIQUE(document_id, version_number)
);

-- Index for version lookup
CREATE INDEX idx_versions_document ON document_versions(document_id, version_number DESC);
```

---

### document_checkouts

Check-in/check-out locking system.

```sql
CREATE TABLE public.document_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL UNIQUE,
  
  -- Lock Info
  checked_out_by UUID REFERENCES auth.users NOT NULL,
  checked_out_at TIMESTAMPTZ DEFAULT now(),
  expected_checkin TIMESTAMPTZ,
  
  -- Lock Details
  lock_reason TEXT,
  is_forced BOOLEAN DEFAULT false,
  
  -- Notification
  notify_on_checkin BOOLEAN DEFAULT true,
  watchers UUID[] DEFAULT '{}',
  
  -- Auto-release
  auto_release_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user's checkouts
CREATE INDEX idx_checkouts_user ON document_checkouts(checked_out_by);
```

---

### document_shares

Sharing configuration.

```sql
CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  
  -- Share Configuration
  share_type TEXT NOT NULL, -- 'link', 'email', 'user', 'group'
  access_level TEXT DEFAULT 'view', -- 'view', 'comment', 'edit', 'admin'
  
  -- Target (for user/email shares)
  shared_with UUID REFERENCES auth.users,
  shared_email TEXT,
  
  -- Link Settings (for link shares)
  share_token TEXT UNIQUE,
  password_hash TEXT,
  
  -- Restrictions
  expires_at TIMESTAMPTZ,
  download_allowed BOOLEAN DEFAULT true,
  print_allowed BOOLEAN DEFAULT true,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  
  -- Watermark
  apply_watermark BOOLEAN DEFAULT false,
  watermark_config_id UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_shares_document ON document_shares(document_id);
CREATE INDEX idx_shares_user ON document_shares(shared_with);
CREATE INDEX idx_shares_token ON document_shares(share_token);
CREATE INDEX idx_shares_expires ON document_shares(expires_at) WHERE expires_at IS NOT NULL;
```

---

### document_tags

Tag management.

```sql
CREATE TABLE public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Tag Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT '#6366F1',
  description TEXT,
  
  -- AI
  is_ai_suggested BOOLEAN DEFAULT false,
  confidence_score NUMERIC(3,2),
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, slug)
);

-- Junction table
CREATE TABLE public.document_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  tag_id UUID REFERENCES document_tags NOT NULL,
  
  assigned_by UUID REFERENCES auth.users,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  
  is_ai_assigned BOOLEAN DEFAULT false,
  confidence NUMERIC(3,2),
  
  UNIQUE(document_id, tag_id)
);

-- Indexes
CREATE INDEX idx_tag_assignments_document ON document_tag_assignments(document_id);
CREATE INDEX idx_tag_assignments_tag ON document_tag_assignments(tag_id);
```

---

### document_favorites

Favorites/starred documents.

```sql
CREATE TABLE public.document_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  document_id UUID REFERENCES documents NOT NULL,
  
  -- Organization
  color TEXT, -- Custom color for the star
  notes TEXT, -- User notes
  priority INTEGER DEFAULT 0, -- Sorting priority
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, document_id)
);

CREATE INDEX idx_favorites_user ON document_favorites(user_id, priority DESC);
```

---

### quick_access_items

Quick access configuration.

```sql
CREATE TABLE public.quick_access_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  document_id UUID REFERENCES documents NOT NULL,
  
  -- Priority
  priority_level TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  position INTEGER DEFAULT 0,
  
  -- Auto-calculated
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  
  -- Settings
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, document_id)
);
```

---

### document_summaries

AI-generated summaries.

```sql
CREATE TABLE public.document_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  
  -- Summary Types
  summary_type TEXT NOT NULL, -- 'executive', 'detailed', 'key_points', 'action_items'
  
  -- Content
  summary_text TEXT NOT NULL,
  key_points JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  
  -- AI Metadata
  model_used TEXT,
  confidence_score NUMERIC(3,2),
  word_count INTEGER,
  processing_time_ms INTEGER,
  
  -- Multi-language
  language TEXT DEFAULT 'en',
  
  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(document_id, summary_type, language)
);

CREATE INDEX idx_summaries_document ON document_summaries(document_id);
```

---

### watermark_configurations

Watermark templates.

```sql
CREATE TABLE public.watermark_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Watermark Info
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  
  -- Configuration
  watermark_type TEXT DEFAULT 'text', -- 'text', 'image', 'dynamic'
  
  -- Text Watermark
  text_content TEXT,
  font_family TEXT DEFAULT 'Arial',
  font_size INTEGER DEFAULT 48,
  font_color TEXT DEFAULT '#000000',
  opacity NUMERIC(3,2) DEFAULT 0.3,
  
  -- Positioning
  position TEXT DEFAULT 'center', -- 'center', 'diagonal', 'tile', 'custom'
  rotation INTEGER DEFAULT -45,
  x_offset INTEGER DEFAULT 0,
  y_offset INTEGER DEFAULT 0,
  
  -- Dynamic Fields
  include_username BOOLEAN DEFAULT false,
  include_date BOOLEAN DEFAULT false,
  include_email BOOLEAN DEFAULT false,
  custom_template TEXT, -- '{username} - {date}'
  
  -- Image Watermark
  image_url TEXT,
  image_scale NUMERIC(3,2) DEFAULT 1.0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### custom_metadata_fields

Custom field definitions.

```sql
CREATE TABLE public.custom_metadata_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Field Definition
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL, -- Slug for storage
  field_type TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'multi_select', 'boolean'
  
  -- Configuration
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  placeholder TEXT,
  description TEXT,
  
  -- Select Options (for select/multi_select)
  options JSONB DEFAULT '[]', -- [{"value": "opt1", "label": "Option 1"}]
  
  -- Validation
  validation_rules JSONB DEFAULT '{}',
  -- Example: {"min": 0, "max": 100, "pattern": "^[A-Z]{3}$"}
  
  -- Scope
  applies_to_types TEXT[] DEFAULT '{}', -- Empty = all types
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, field_key)
);
```

---

### ownership_transfers

Document ownership transfer requests.

```sql
CREATE TABLE public.ownership_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents NOT NULL,
  
  -- Transfer Details
  from_user_id UUID REFERENCES auth.users NOT NULL,
  to_user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
  
  -- Request
  request_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  
  -- Response
  response_reason TEXT,
  responded_at TIMESTAMPTZ,
  
  -- Options
  transfer_versions BOOLEAN DEFAULT true,
  transfer_shares BOOLEAN DEFAULT false,
  notify_collaborators BOOLEAN DEFAULT true
);

CREATE INDEX idx_transfers_pending ON ownership_transfers(to_user_id) 
  WHERE status = 'pending';
```

---

### migration_jobs

Document migration tracking.

```sql
CREATE TABLE public.migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Source
  source_type TEXT NOT NULL, -- 'google_drive', 'onedrive', 'sharepoint', 'filenet', 'local'
  source_config JSONB NOT NULL,
  
  -- Progress
  status TEXT DEFAULT 'pending',
  -- Values: 'pending', 'connecting', 'scanning', 'migrating', 'completed', 'failed', 'cancelled'
  
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  skipped_files INTEGER DEFAULT 0,
  
  total_bytes BIGINT DEFAULT 0,
  processed_bytes BIGINT DEFAULT 0,
  
  -- Options
  preserve_folder_structure BOOLEAN DEFAULT true,
  preserve_metadata BOOLEAN DEFAULT true,
  preserve_permissions BOOLEAN DEFAULT false,
  handle_duplicates TEXT DEFAULT 'rename', -- 'skip', 'rename', 'overwrite'
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Error Tracking
  errors JSONB DEFAULT '[]',
  last_error TEXT,
  
  -- Checkpointing
  last_checkpoint JSONB,
  checkpoint_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_migrations_user ON migration_jobs(user_id);
CREATE INDEX idx_migrations_status ON migration_jobs(status);
```

---

## RLS Policies

### Documents RLS

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Owner access
CREATE POLICY "documents_owner_all"
ON documents FOR ALL
USING (auth.uid() = user_id);

-- Shared access (read)
CREATE POLICY "documents_shared_select"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_shares ds
    WHERE ds.document_id = documents.id
      AND ds.is_active = true
      AND (ds.shared_with = auth.uid() OR ds.share_token IS NOT NULL)
      AND (ds.expires_at IS NULL OR ds.expires_at > now())
  )
);
```

### Folders RLS

```sql
ALTER TABLE smart_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_owner_all"
ON smart_folders FOR ALL
USING (auth.uid() = user_id);
```

---

## Triggers

### Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Folder Document Count

```sql
CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE smart_folders 
    SET document_count = document_count + 1
    WHERE id = NEW.parent_folder_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE smart_folders 
    SET document_count = document_count - 1
    WHERE id = OLD.parent_folder_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_folder_id != NEW.parent_folder_id THEN
    UPDATE smart_folders SET document_count = document_count - 1
    WHERE id = OLD.parent_folder_id;
    UPDATE smart_folders SET document_count = document_count + 1
    WHERE id = NEW.parent_folder_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_folder_count
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_folder_document_count();
```

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| documents | `idx_documents_user_id` | User's documents lookup |
| documents | `idx_documents_search` | Full-text search (GIN) |
| documents | `idx_documents_folder` | Folder contents |
| documents | `idx_documents_created` | Recent documents |
| smart_folders | `idx_folders_path` | Path-based queries |
| document_shares | `idx_shares_token` | Share link lookup |
| document_versions | `idx_versions_document` | Version history |

---

## Data Types Reference

### Processing Status

```typescript
type ProcessingStatus = 
  | 'pending'      // Queued for processing
  | 'processing'   // Currently being processed
  | 'completed'    // Successfully processed
  | 'failed'       // Processing failed
  | 'cancelled';   // Cancelled by user
```

### Document Types

```typescript
type DocumentType = 
  | 'invoice'
  | 'contract'
  | 'receipt'
  | 'report'
  | 'presentation'
  | 'spreadsheet'
  | 'image'
  | 'email'
  | 'form'
  | 'other';
```

### Access Levels

```typescript
type AccessLevel = 
  | 'view'     // Read-only access
  | 'comment'  // Can add comments
  | 'edit'     // Can modify content
  | 'admin';   // Full control including sharing
```

---

*Schema Version: 1.0.0 | Last Updated: December 2024*
