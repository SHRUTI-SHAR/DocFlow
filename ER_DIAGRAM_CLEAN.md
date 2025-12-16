# Document Management System - ER Diagram

## Visual ER Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    SUPABASE STORAGE (Bucket: 'documents')                   │
│                                                                              │
│                      ┌──────────────────────────────────┐                   │
│                      │  Uploaded PDF/Document Files     │                   │
│                      │  (Stored by storage_path)        │                   │
│                      └──────────────────┬───────────────┘                   │
│                                         │                                   │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                                          │ references
                                          │ storage_path
                                          │
                          ┌───────────────▼──────────────────┐
                          │      📄 documents TABLE          │
                          │  ───────────────────────────────  │
                          │  id (uuid) PRIMARY KEY           │
                          │  user_id (FK)                    │
                          │  file_name                       │
                          │  file_type                       │
                          │  file_size                       │
                          │  storage_path                    │
                          │  processing_status               │
                          │  extracted_text                  │
                          │  ┌─────────────────────────────┐ │
                          │  │ 🗑️ is_deleted (boolean)    │ │
                          │  │    ◄─── DELETE FLAG         │ │
                          │  └─────────────────────────────┘ │
                          │  ┌─────────────────────────────┐ │
                          │  │ 📅 deleted_at (timestamp)  │ │
                          │  │    ◄─── DELETION TIME       │ │
                          │  └─────────────────────────────┘ │
                          │  created_at                      │
                          │  updated_at                      │
                          └────────┬──────────────────────────┘
                                   │
                          ┌────────┴────────┐
                          │                 │
                          ▼                 ▼
                  ┌──────────────┐    ┌──────────────────────────┐
                  │document_     │    │      auth.users          │
                  │chunks TABLE  │    │  (Supabase Auth)        │
                  │──────────────│    │  ────────────────────   │
                  │id (uuid) PK  │    │  id (uuid)              │
                  │document_id FK├──┐ │  email                  │
                  │chunk_index   │  │ │  name                   │
                  │chunk_text    │  │ └──────────────────────────┘
                  │chunk_        │  │           ▲
                  │embedding     │  │           │
                  │token_count   │  │      ┌────┴────┐
                  │created_at    │  │      │          │
                  └──────────────┘  │      ▼          ▼
                                    │  ┌──────────────────────────────┐
                                    │  │   smart_folders TABLE        │
                                    │  │  ───────────────────────────  │
                                    │  │  id (uuid) PRIMARY KEY       │
                                    │  │  user_id (FK)               │
                                    │  │  name                       │
                                    │  │  folder_color               │
                                    │  │  icon                       │
                                    │  │  document_count             │
                                    │  │  created_at                 │
                                    │  │  updated_at                 │
                                    │  └────────┬────────────────────┘
                                    │           │
                                    │           │ 1:M
                                    │           │
                                    │  ┌────────▼──────────────────┐
                                    │  │ document_shortcuts         │
                                    │  │ (JUNCTION TABLE - M:N)    │
                                    │  │─────────────────────────── │
                                    │  │ id (uuid) PRIMARY KEY     │
                                    │  │ document_id (FK) ────┐    │
                                    │  │ folder_id (FK) ──────┼──┐ │
                                    │  │ user_id (FK) ────────┼──┼─┘
                                    │  │ created_at           │  │
                                    │  │ updated_at           │  │
                                    │  └──────────────────────┼──┘
                                    │                        │
                                    └────────────────────────┘
```

---

## Table Schemas

### **1. documents** - Where documents are stored with DELETE FLAG

```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text NOT NULL,              -- Path in Supabase Storage
  processing_status text,
  extracted_text text,
  is_deleted boolean DEFAULT false,        -- ◄─── DELETE FLAG (explicit column)
  deleted_at timestamp,                    -- ◄─── DELETION TIMESTAMP
  created_at timestamp,
  updated_at timestamp
);
```

---

### **2. document_chunks** - Text chunks for semantic search

```sql
CREATE TABLE document_chunks (
  id uuid PRIMARY KEY,
  document_id uuid REFERENCES documents(id),
  chunk_index integer,
  chunk_text text,
  chunk_embedding vector,                  -- pgvector for AI search
  token_count integer,
  created_at timestamp
);
```

---

### **3. smart_folders** - AI-organized document folders

```sql
CREATE TABLE smart_folders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  folder_color varchar,
  icon varchar,
  document_count integer,
  created_at timestamp,
  updated_at timestamp
);
```

---

### **4. document_shortcuts** - Junction table (Many-to-Many)

```sql
CREATE TABLE document_shortcuts (
  id uuid PRIMARY KEY,
  document_id uuid REFERENCES documents(id),
  folder_id uuid REFERENCES smart_folders(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp,
  updated_at timestamp
);
```

---

## Key Locations

| What | Where |
|---|---|
| **📄 Stored Documents** | `Supabase Storage` bucket named `documents` |
| **📍 File Path Reference** | `documents.storage_path` field |
| **🗑️ Delete Flag** | `documents.is_deleted` column (boolean) |
| **📅 Deleted Timestamp** | `documents.deleted_at` column (timestamp) |
| **🔗 Folder Links** | `document_shortcuts` junction table (M:N relationship) |

