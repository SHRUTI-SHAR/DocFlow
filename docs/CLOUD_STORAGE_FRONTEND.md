# Cloud Storage Integration - Frontend Guide

## Overview

The frontend now supports creating bulk processing jobs from multiple sources:
- **Local Folder**: Traditional file system paths
- **Google Drive**: Google Drive folders and shared drives
- **OneDrive**: Microsoft OneDrive and SharePoint

## New Components

### 1. `CloudSourceConfig.tsx`
Reusable component for configuring Google Drive and OneDrive connections.

**Features:**
- Authentication method selection (service account, OAuth, client credentials)
- Folder/Drive selection
- File type filtering
- Recursive search toggle
- Inline help and tooltips

### 2. `CreateBulkJobWithSources.tsx`
Enhanced job creation wizard with tabbed interface for different source types.

**Features:**
- Tab-based source selection
- Integrated configuration for each source type
- Validation and error handling
- Direct job creation and start

## Usage

### Option 1: Use the New Component (Recommended)

Replace the existing `CreateBulkJob` import in `Upload.tsx`:

```tsx
import { CreateBulkJobWithSources } from "@/components/bulk-processing/CreateBulkJobWithSources";

// In your component:
<CreateBulkJobWithSources
  onComplete={(jobId) => {
    setBulkProcessingView('dashboard');
    setSelectedJobId(jobId);
  }}
  onCancel={() => setBulkProcessingView('dashboard')}
/>
```

### Option 2: Use Original Component

Keep using `CreateBulkJob` for file upload workflow (unchanged functionality).

## Type Definitions

Updated types in `src/types/bulk-processing.ts`:

```typescript
export type SourceType = 'folder' | 'database' | 'cloud' | 'google_drive' | 'onedrive';

export interface GoogleDriveSourceConfig {
  type: 'google_drive';
  folderId?: string;
  credentialsJson?: string;
  credentialsFile?: string;
  tokenFile?: string;
  fileTypes?: string[];
  recursive?: boolean;
  sharedDriveId?: string;
}

export interface OneDriveSourceConfig {
  type: 'onedrive';
  folderPath?: string;
  clientId: string;
  clientSecret?: string;
  tenantId: string;
  tokenFile?: string;
  fileTypes?: string[];
  recursive?: boolean;
  siteId?: string;
  driveId?: string;
}
```

## API Integration

The frontend uses the existing `bulkJobsApi.createJob()` method with new source types:

```typescript
const jobData = {
  name: "My Google Drive Job",
  source_type: "google_drive",
  source_config: {
    credentials_file: "/path/to/credentials.json",
    folder_id: "1a2b3c4d5e6f7g8h9i",
    file_types: ["application/pdf"],
    recursive: true
  },
  processing_config: {
    mode: "once",
    discovery_batch_size: 50
  },
  processing_options: {
    priority: 3,
    max_retries: 3,
    parallel_workers: 10,
    // ... other options
  }
};

const job = await bulkJobsApi.createJob(jobData);
await bulkJobsApi.startJob(job.id);
```

## User Experience

### Google Drive Setup
1. User selects "Google Drive" tab
2. Chooses authentication method
3. Provides credentials (JSON, file path, or token)
4. Optionally specifies folder ID and shared drive
5. Creates and starts job

### OneDrive Setup
1. User selects "OneDrive" tab
2. Enters Azure AD Client ID and Tenant ID
3. Chooses authentication (client secret or token file)
4. Optionally specifies folder path, site, and drive
5. Creates and starts job

## Configuration Examples

### Google Drive with Service Account
```typescript
{
  type: 'google_drive',
  credentialsJson: '{"type":"service_account",...}',
  folderId: '1a2b3c4d5e6f7g8h9i',
  fileTypes: ['application/pdf', 'image/jpeg'],
  recursive: true
}
```

### OneDrive with Client Credentials
```typescript
{
  type: 'onedrive',
  clientId: '12345678-1234-1234-1234-123456789abc',
  clientSecret: 'your-secret',
  tenantId: '87654321-4321-4321-4321-abcdefghijkl',
  folderPath: '/Documents/Invoices',
  fileTypes: ['.pdf', '.jpg'],
  recursive: true
}
```

## Error Handling

The components validate configuration before creating jobs:

- **Google Drive**: Requires at least one authentication method
- **OneDrive**: Requires clientId, tenantId, and either clientSecret or tokenFile
- **Folder**: Requires valid path

Toast notifications inform users of validation errors and job creation status.

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never store credentials in frontend code or localStorage**
2. **Credentials should be configured on the server**
3. **Frontend only passes paths to server-side credential files**
4. **For production, use environment-specific configuration management**

## Styling

Components use:
- Shadcn UI components (Card, Input, Label, Tabs, etc.)
- Tailwind CSS for styling
- Lucide React icons
- Responsive design with proper spacing

## Testing

To test the integration:

1. **Google Drive:**
   - Set up service account in Google Cloud Console
   - Share a folder with service account email
   - Use the credentials in the UI

2. **OneDrive:**
   - Register app in Azure AD
   - Grant Files.Read.All permission
   - Use client credentials in the UI

3. **Verify:**
   - Job creates successfully
   - Documents are discovered
   - Processing begins

## Future Enhancements

Potential improvements:
- OAuth flow directly in the UI
- Credential management interface
- Preview of discoverable files
- Estimated processing time/cost
- Batch job templates
- Saved configurations

## Support

For issues or questions:
- Check backend logs for authentication errors
- Verify API permissions in Google/Azure consoles
- Review `CLOUD_STORAGE_INTEGRATION.md` for backend setup
- Test with small folders first
