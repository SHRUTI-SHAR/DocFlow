# SimplifyDrive Migration Guide

> Complete guide for migrating documents from external systems to SimplifyDrive.

---

## Overview

SimplifyDrive supports high-throughput migration from multiple document management systems:

| Source | Support Level | Features |
|--------|--------------|----------|
| Google Drive | ✅ Full | Folders, permissions, metadata |
| Microsoft OneDrive | ✅ Full | Folders, sharing, metadata |
| SharePoint | ✅ Full | Libraries, workflows, metadata |
| IBM FileNet | ✅ Full | Object store, metadata, versions |
| Box | 🟡 Partial | Folders, basic metadata |
| Dropbox | 🟡 Partial | Folders, basic sharing |
| Local/Network | ✅ Full | All file types, folder structure |

---

## Quick Start

### 1. Access Migration Dashboard

Navigate to **SimplifyDrive** → **Migration** tab

### 2. Select Source

Choose your document source:
- Google Drive
- OneDrive/SharePoint
- FileNet
- Local Upload

### 3. Authenticate

Connect to your source system:
- OAuth for cloud services
- API credentials for enterprise systems
- Folder selection for local upload

### 4. Configure Options

Set migration preferences:
- Folder structure handling
- Metadata mapping
- Duplicate handling
- Target location

### 5. Start Migration

Click **Start Migration** and monitor progress.

---

## Source-Specific Guides

### Google Drive

#### Authentication

1. Click **Connect Google Drive**
2. Sign in with Google account
3. Grant required permissions:
   - `drive.readonly` - Read files
   - `drive.metadata.readonly` - Read metadata

#### Selecting Content

```
📁 My Drive
├── 📁 Projects (selected)
│   ├── 📁 2024
│   └── 📁 Archive
├── 📁 Shared with me
└── 📁 Starred
```

Options:
- Select specific folders
- Include shared files
- Include starred items

#### Metadata Mapping

| Google Drive | SimplifyDrive |
|--------------|---------------|
| Name | file_name |
| Created time | created_at |
| Modified time | updated_at |
| Owners | metadata.original_owner |
| Description | metadata.description |
| Starred | is_favorite |

#### Permissions Mapping

| Google Permission | SimplifyDrive Equivalent |
|-------------------|--------------------------|
| Owner | Admin |
| Editor | Edit |
| Commenter | Comment |
| Viewer | View |

---

### Microsoft OneDrive / SharePoint

#### Authentication

1. Click **Connect Microsoft**
2. Sign in with Microsoft account
3. Grant permissions:
   - `Files.Read.All` - Read files
   - `Sites.Read.All` - Read SharePoint sites

#### SharePoint Libraries

Select specific document libraries:

```
📁 SharePoint Sites
├── 📁 Marketing Team
│   ├── 📚 Documents
│   ├── 📚 Templates
│   └── 📚 Archives
└── 📁 Engineering
    └── 📚 Technical Docs
```

#### Metadata Mapping

| SharePoint Column | SimplifyDrive |
|-------------------|---------------|
| Title | file_name |
| Created | created_at |
| Modified | updated_at |
| Author | metadata.author |
| Content Type | document_type |
| Custom columns | custom_fields.* |

#### Preserving Workflows

SharePoint workflow history is preserved in metadata:

```json
{
  "workflow_history": [
    {
      "workflow_name": "Document Approval",
      "status": "Completed",
      "completed_at": "2024-01-15"
    }
  ]
}
```

---

### IBM FileNet

#### Connection Setup

Required credentials:
- Server URL
- Object Store name
- Username/Password or OAuth

```typescript
interface FileNetConfig {
  serverUrl: string;        // https://filenet.company.com
  objectStore: string;      // 'ProductionOS'
  authentication: {
    type: 'basic' | 'oauth';
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
  };
}
```

#### Content Selection

Query-based selection:

```sql
-- Migrate all invoices from 2024
SELECT * FROM Document 
WHERE DocumentClass = 'Invoice' 
AND DateCreated >= '2024-01-01'
```

Or folder-based:

```
📁 /ObjectStore
├── 📁 Departments
│   ├── 📁 Finance
│   └── 📁 Legal
└── 📁 Projects
```

#### Property Mapping

| FileNet Property | SimplifyDrive |
|------------------|---------------|
| DocumentTitle | file_name |
| DateCreated | created_at |
| DateLastModified | updated_at |
| ContentSize | file_size |
| MimeType | mime_type |
| Custom Properties | custom_fields |

#### Version Migration

FileNet versions are preserved:

```typescript
interface VersionMigration {
  migrateAllVersions: boolean;  // or just current
  preserveVersionLabels: boolean;
  versionMapping: 'sequential' | 'preserve';
}
```

---

### Local / Network Drive

#### Folder Selection

Drag & drop or browse to select:

```
📁 Selected Folders
├── 📁 C:\Documents\Projects
├── 📁 \\network\shared\templates
└── 📁 D:\Archive\2023
```

#### Options

| Option | Description |
|--------|-------------|
| Preserve folder structure | Recreate folders in SimplifyDrive |
| Include hidden files | Migrate hidden/system files |
| Include empty folders | Create empty folder structure |
| Follow symlinks | Follow symbolic links |

---

## Migration Options

### Folder Structure

**Preserve Structure:**
```
Source:                    SimplifyDrive:
📁 Projects                📁 Projects
├── 📁 2024       →       ├── 📁 2024
│   └── 📄 doc1           │   └── 📄 doc1
└── 📁 2023                └── 📁 2023
    └── 📄 doc2                └── 📄 doc2
```

**Flatten:**
```
Source:                    SimplifyDrive:
📁 Projects                📁 Migration Import
├── 📁 2024       →       ├── 📄 doc1
│   └── 📄 doc1           └── 📄 doc2
└── 📁 2023
    └── 📄 doc2
```

### Duplicate Handling

| Option | Behavior |
|--------|----------|
| **Skip** | Don't migrate if file exists |
| **Rename** | Add suffix (doc_1.pdf) |
| **Overwrite** | Replace existing file |
| **Version** | Create new version |

Detection methods:
- Name match
- Content hash (SHA-256)
- Name + size match

### Metadata Handling

**Preserve All:**
```json
{
  "original_metadata": {
    "source": "google_drive",
    "original_id": "abc123",
    "original_owner": "user@company.com",
    "original_permissions": [...],
    "custom_properties": {...}
  }
}
```

**Map to Fields:**
Configure which source properties map to SimplifyDrive fields.

**Discard:**
Only migrate file content, no metadata.

---

## Progress Monitoring

### Migration Dashboard

```
┌─────────────────────────────────────────────────────┐
│  Migration Progress                                  │
├─────────────────────────────────────────────────────┤
│  ████████████████████░░░░░  75%                     │
│                                                      │
│  Files:    7,500 / 10,000                           │
│  Size:     2.1 GB / 2.8 GB                          │
│  Speed:    ~45 files/min                            │
│  ETA:      ~55 minutes                              │
│                                                      │
│  ✅ Completed: 7,450                                │
│  ⏳ Processing: 50                                  │
│  ⚠️  Skipped: 12                                    │
│  ❌ Failed: 3                                       │
│                                                      │
│  [Pause]  [Cancel]  [View Errors]                   │
└─────────────────────────────────────────────────────┘
```

### Real-time Logs

```
[14:32:15] ✅ Migrated: /Projects/2024/Q1_Report.pdf (2.4 MB)
[14:32:16] ✅ Migrated: /Projects/2024/Budget.xlsx (156 KB)
[14:32:17] ⚠️ Skipped: /Projects/2024/Copy of Budget.xlsx (duplicate)
[14:32:18] ❌ Failed: /Projects/2024/Corrupted.pdf (read error)
[14:32:19] ✅ Migrated: /Projects/2024/Presentation.pptx (8.1 MB)
```

### Error Handling

| Error Type | Resolution |
|------------|------------|
| File too large | Split or upgrade plan |
| Unsupported format | Convert before retry |
| Permission denied | Re-authenticate |
| Network timeout | Auto-retry (3x) |
| Corrupted file | Skip or attempt repair |

---

## Post-Migration

### Verification

After migration completes:

1. **Count Verification**
   - Compare source vs destination counts
   - Review skipped/failed items

2. **Sampling**
   - Randomly check 5% of files
   - Verify content integrity

3. **Metadata Check**
   - Confirm custom fields mapped
   - Verify folder structure

### Cleanup Options

**Source Cleanup (Optional):**
- Archive migrated files
- Delete after verification
- Add "Migrated" label

**SimplifyDrive Optimization:**
- Run AI classification
- Generate summaries
- Create smart folders

---

## API Reference

### Start Migration

```typescript
const startMigration = async (config: MigrationConfig) => {
  const { data, error } = await supabase.functions.invoke('start-migration', {
    body: {
      sourceType: 'google_drive',
      sourceConfig: {
        folderId: 'folder_id',
        includeShared: true,
      },
      options: {
        preserveStructure: true,
        handleDuplicates: 'skip',
        preserveMetadata: true,
        targetFolderId: 'target_folder_id',
      }
    }
  });
  
  return data.jobId;
};
```

### Monitor Progress

```typescript
const getProgress = async (jobId: string) => {
  const { data } = await supabase
    .from('migration_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  return {
    status: data.status,
    progress: data.processed_files / data.total_files,
    eta: calculateETA(data),
    errors: data.errors,
  };
};
```

### Pause/Resume

```typescript
// Pause
await supabase.functions.invoke('pause-migration', {
  body: { jobId }
});

// Resume
await supabase.functions.invoke('resume-migration', {
  body: { jobId }
});
```

### Cancel

```typescript
await supabase.functions.invoke('cancel-migration', {
  body: { 
    jobId,
    cleanup: true  // Remove partially migrated files
  }
});
```

---

## Best Practices

### Before Migration

✅ **Audit Source Content**
- Identify large files
- Note custom metadata
- Document folder structure

✅ **Clean Up Source**
- Remove duplicates
- Delete obsolete files
- Organize into folders

✅ **Plan Timing**
- Schedule during off-hours
- Allow buffer time
- Notify stakeholders

### During Migration

✅ **Monitor Progress**
- Watch for errors
- Check rate limits
- Verify sample files

✅ **Handle Errors Promptly**
- Review failed items
- Adjust settings if needed
- Document issues

### After Migration

✅ **Verify Completeness**
- Compare counts
- Check random samples
- Verify permissions

✅ **Optimize Content**
- Run AI processing
- Create smart folders
- Set up workflows

✅ **Train Users**
- Share new locations
- Explain new features
- Provide support contacts

---

## Troubleshooting

### Slow Migration

**Causes:**
- Large files
- Network latency
- Rate limiting

**Solutions:**
1. Migrate in batches
2. Schedule overnight
3. Use parallel connections

### Authentication Errors

**Google Drive:**
- Re-authorize if token expired
- Check granted permissions
- Verify domain policies

**SharePoint:**
- Confirm site permissions
- Check app registration
- Verify tenant settings

### Missing Files

**Check:**
- File permissions in source
- Hidden/system files setting
- Filter criteria applied

---

## Compliance Considerations

### Data Residency

- Verify target region meets requirements
- Document data transfer for audits

### Chain of Custody

- Migration audit log preserved
- Original metadata retained
- Timestamps documented

### Legal Hold

- Identify held content before migration
- Maintain hold status in SimplifyDrive
- Document migration date

---

*Migration Guide v1.0.0 | Last Updated: December 2024*
