# Document Management System - ER Diagram & Schema

## Overview
This document describes the Entity-Relationship (ER) diagram for the Document Management System with Smart Folders and Recycle Bin functionality.

---

## ER Diagram (Text Format)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT MANAGEMENT SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │   auth.users     │
                            │  (Supabase Auth) │
                            │  ────────────────│
                            │  id (uuid) PK    │
                            │  email           │
                            │  name            │
                            └────────┬─────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
        ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │   documents     │  │  smart_folders   │  │ document_chunks  │
        │  ─────────────  │  │  ──────────────   │  │  ──────────────  │
        │  id (uuid) PK   │  │  id (uuid) PK    │  │  id (uuid) PK    │
        │  user_id FK     │  │  user_id FK      │  │  document_id FK  │
        │  file_name      │  │  name            │  │  chunk_index     │
        │  file_type      │  │  folder_color    │  │  chunk_text      │
        │  file_size      │  │  icon            │  │  chunk_embedding │
        │  storage_path   │  │  document_count  │  │  token_count     │
        │  processing...  │  │  description     │  │  created_at      │
        │  extracted_text │  │  created_at      │  └──────────────────┘
        │  metadata {*}   │  │  updated_at      │
        │  created_at     │  └────────┬─────────┘
        │  updated_at     │           │
        └────────┬────────┘           │
                 │                    │
                 │          ┌─────────┴─────────┐
                 │          │                   │
                 │          ▼                   ▼
                 │  ┌────────────────────────────────────────┐
                 │  │   document_shortcuts (Junction Table)  │
                 │  │   ─────────────────────────────────────│
                 │  │   id (uuid) PK                         │
                 │  │   document_id FK ──┐                   │
                 │  │   folder_id FK ────┴──► smart_folders │
                 │  │   user_id FK ──────────► users        │
                 │  │   created_at                           │
                 │  │   updated_at                           │
                 │  └────────────────────────────────────────┘

```

---

## Table Schemas

### 1. **documents**
Core table for storing document information.

```sql
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                          -- References auth.users
  file_name text NOT NULL,
  file_type text NOT NULL,                        -- e.g., 'application/pdf'
  file_size bigint NOT NULL,                      -- File size in bytes
  storage_path text NOT NULL,                     -- Path in Supabase Storage
  original_url text,
  upload_source text DEFAULT 'manual'::text,
  processing_status text DEFAULT 'pending'::text, -- pending | processing | completed | failed
  analysis_result jsonb DEFAULT '{}'::jsonb,     -- AI analysis results
  extracted_text text,                            -- OCR/extraction results
  confidence_score numeric DEFAULT 0,
  template_id uuid,                               -- Link to document_templates
  metadata jsonb DEFAULT '{}'::jsonb,             -- **Soft Delete Flag: {"is_deleted": true, "deleted_at": "..."}
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  document_type text,                             -- e.g., 'invoice', 'receipt', 'form'
  
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES document_templates(id)
);

-- Key Features:
-- - metadata.is_deleted flag for soft delete (Recycle Bin)
-- - metadata.deleted_at timestamp for when document was deleted
-- - storage_path references Supabase Storage bucket 'documents'
-- - processing_status tracks AI processing workflow
```

---

### 2. **smart_folders**
Stores AI-organized document folders and categories.

```sql
CREATE TABLE public.smart_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                          -- References auth.users
  name text NOT NULL,                             -- Folder name (e.g., "Invoices", "Recycle Bin")
  folder_color character varying DEFAULT '#6366f1', -- Hex color for UI
  icon character varying DEFAULT 'Folder',        -- Icon name (e.g., 'Trash2', 'FileText')
  document_count integer DEFAULT 0,               -- Count of documents in folder
  description text,
  folder_type character varying,                  -- System folders: 'recycle-bin', user folders: 'custom'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT smart_folders_pkey PRIMARY KEY (id),
  CONSTRAINT smart_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Key Features:
-- - Many-to-Many with documents via document_shortcuts
-- - Used for AI organization and manual organization
-- - Special "Recycle Bin" folder per user (identified by name='Recycle Bin')
-- - folder_color: UI styling color
-- - icon: UI icon display
```

---

### 3. **document_shortcuts** (Junction Table)
Many-to-Many relationship between documents and folders.

```sql
CREATE TABLE public.document_shortcuts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,                      -- References documents
  folder_id uuid NOT NULL,                        -- References smart_folders
  user_id uuid NOT NULL,                          -- Denormalized for query performance
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT document_shortcuts_pkey PRIMARY KEY (id),
  CONSTRAINT document_shortcuts_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT document_shortcuts_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES smart_folders(id) ON DELETE CASCADE,
  CONSTRAINT document_shortcuts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Key Features:
-- - Enables one document to exist in multiple folders
-- - One document can be in Recycle Bin + original folders
-- - Cascade delete: removing document removes all shortcuts
-- - user_id helps with query optimization
```

---

### 4. **document_chunks**
Stores text chunks for semantic search and RAG.

```sql
CREATE TABLE public.document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,                      -- References documents
  chunk_index integer NOT NULL,                   -- Order of chunk in document
  chunk_text text NOT NULL,                       -- Actual text content
  chunk_embedding vector,                         -- pgvector for semantic search (pgvector extension)
  token_count integer,                            -- For cost tracking
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Key Features:
-- - Enables semantic search across document content
-- - pgvector extension required for chunk_embedding
-- - Supports RAG (Retrieval Augmented Generation)
-- - Cascade delete: removing document removes all chunks
```

---

## Relationships Summary

| Relationship | Type | From Table | To Table | Notes |
|---|---|---|---|---|
| User → Documents | 1:N | auth.users | documents | One user has many documents |
| User → Smart Folders | 1:N | auth.users | smart_folders | One user has many folders |
| User → Document Shortcuts | 1:N | auth.users | document_shortcuts | For denormalization/performance |
| Documents → Chunks | 1:N | documents | document_chunks | One doc has many text chunks |
| Documents ↔ Folders | M:N | documents | smart_folders | Via document_shortcuts junction table |

---

## Soft Delete Implementation (Recycle Bin)

### How Deletion Works:

1. **Frontend DELETE Request:**
   ```
   DELETE /api/v1/documents/{document_id}
   ```

2. **Backend Operations:**
   - Set `documents.metadata.is_deleted = true`
   - Set `documents.metadata.deleted_at = timestamp`
   - Keep document in `document_shortcuts` (still visible in UI)
   - Keep document in all associated folders

3. **Queries Filter Out Deleted:**
   - `/api/v1/documents/{user_id}` excludes `is_deleted: true` docs
   - `/api/v1/folders/{folder_id}/documents` excludes deleted docs
   - `/api/v1/documents/{user_id}/deleted` returns ONLY deleted docs (Recycle Bin view)

### Recycle Bin Folder:
- **Not a separate physical folder** in database
- **Virtual folder** identified by special UI handling
- **No smart_folders entry needed** (uses metadata flag instead)
- **Reduces DB clutter** (no duplicate folder creation)

---

## Metadata Field Structure

The `metadata` jsonb field in `documents` table stores:

```json
{
  "is_deleted": false,                          // Soft delete flag
  "deleted_at": "2025-12-16T01:02:37.123Z",   // When deleted
  "tags": ["important", "finance"],             // User tags
  "insights": {                                  // AI insights
    "summary": "...",
    "key_topics": [...],
    "importance_score": 0.85,
    "estimated_reading_time": 5,
    "ai_generated_title": "...",
    "suggested_actions": [...]
  },
  "extracted_fields": {},                        // Form field extraction
  "custom_properties": {}                        // User-defined metadata
}
```

---

## Key Features

### ✅ Document Organization
- **Smart Folders:** AI-auto-organized documents by type/content
- **Multiple Folders:** One document in multiple folders via junction table
- **Flat Storage:** All files in single Supabase bucket, organized logically in DB

### ✅ Soft Delete (Recycle Bin)
- **Reversible:** Documents can be restored (clear `is_deleted` flag)
- **Metadata-based:** No folder creation needed
- **Query Filtering:** Auto-excluded from "All Documents" view
- **Retention:** Keep deleted docs for X days before permanent deletion

### ✅ Semantic Search
- **Vector Embeddings:** pgvector for AI-powered search
- **Chunk-based:** Full-text search across document content
- **RAG Support:** Retrieval for AI question-answering

### ✅ Performance Optimized
- **Denormalized user_id:** Faster folder queries
- **Cascade deletes:** Automatic cleanup of chunks/shortcuts
- **Indexed paths:** Storage path for quick signed URL generation

---

## SQL Index Recommendations

```sql
-- For faster document lookup by user
CREATE INDEX idx_documents_user_id ON documents(user_id);

-- For faster folder lookup by user
CREATE INDEX idx_smart_folders_user_id ON smart_folders(user_id);

-- For folder document queries
CREATE INDEX idx_document_shortcuts_folder_id ON document_shortcuts(folder_id);
CREATE INDEX idx_document_shortcuts_document_id ON document_shortcuts(document_id);

-- For chunk semantic search
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (chunk_embedding vector_cosine_ops);

-- For soft delete queries
CREATE INDEX idx_documents_deleted ON documents USING GIN (metadata);

-- For quick recycle bin queries
CREATE INDEX idx_documents_is_deleted ON documents ((metadata->>'is_deleted'));
```

---

## API Endpoints Map

| Endpoint | Method | Filters Deleted? | Purpose |
|---|---|---|---|
| `/documents/{user_id}` | GET | ✅ Yes | All active documents |
| `/documents/{user_id}/deleted` | GET | ✅ Only deleted | Recycle bin view |
| `/folders/{folder_id}/documents` | GET | ✅ Yes | Folder view (excludes deleted) |
| `/documents/{id}` | DELETE | ✅ N/A | Soft delete (set is_deleted=true) |
| `/documents/{id}/restore` | PATCH | ✅ N/A | Undelete (clear is_deleted flag) |

---

## User Journey

```
1. Upload Document
   └─► documents table + Supabase Storage

2. Auto-Organize (AI)
   └─► smart_folders created
   └─► document_shortcuts added

3. View All Documents
   └─► /documents/{user_id}
   └─► Excludes is_deleted:true docs

4. Delete Document
   └─► DELETE /documents/{id}
   └─► Set metadata.is_deleted = true
   └─► Document disappears from "All Documents"

5. View Recycle Bin
   └─► /documents/{user_id}/deleted
   └─► Shows ONLY is_deleted:true docs

6. Restore Document
   └─► PATCH /documents/{id}/restore
   └─► Clear metadata.is_deleted flag
   └─► Document reappears in "All Documents"

7. Permanent Delete (Optional)
   └─► DELETE from documents, document_chunks, document_shortcuts
   └─► Free up storage in Supabase
```

---

## Future Enhancements

- [ ] Document versioning (track changes over time)
- [ ] Role-based access control (share folders with team)
- [ ] Audit logs (track who viewed/modified documents)
- [ ] Retention policies (auto-delete after X days)
- [ ] Bulk operations (move/delete multiple documents)
- [ ] Document expiry (set document expiration dates)
- [ ] Archival (separate archive storage for old docs)

