# Google Drive Authentication Implementation Guide

## Overview

This document explains the Google Drive OAuth 2.0 authentication implementation for bulk document processing. The system uses a **client-side OAuth flow** where users authenticate directly with Google, and access tokens are sent to the backend for API operations.

## Architecture

### Flow Diagram

```
User → Frontend → Google OAuth → Callback → Frontend → Backend API
                     ↓                          ↓
               Access Token              Send Token with Job
```

### Key Components

1. **Frontend OAuth Service** (`src/services/oauthService.ts`)
2. **OAuth Callback Page** (`public/oauth-callback.html`)
3. **Cloud Source Config** (`src/components/bulk-processing/CloudSourceConfigSimple.tsx`)
4. **Google Drive Folder Browser** (`src/components/bulk-processing/GoogleDriveFolderBrowser.tsx`)
5. **Backend OAuth Endpoints** (`backend-bulk/app/api/v1/oauth.py`) - Optional, for server-side flow

## Setup Instructions

### 1. Google Cloud Console Setup

#### Create a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

#### Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select **External** user type (or Internal for Google Workspace)
3. Fill in required fields:
   - App name: `DocuFlow` (or your app name)
   - User support email: Your email
   - Developer contact email: Your email
4. Add scopes:
   - `.../auth/drive.readonly` (Read-only access to Drive)
5. Add test users (if in testing mode):
   - Add your Google account email
6. Save and continue

#### Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `DocuFlow Web Client`
5. Authorized JavaScript origins:
   ```
   http://localhost:5173
   http://localhost:5174
   https://yourdomain.com
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:5173/oauth-callback.html
   http://localhost:5174/oauth-callback.html
   https://yourdomain.com/oauth-callback.html
   ```
7. Click "Create"
8. **Copy the Client ID** (you'll need this)

### 2. Environment Configuration

#### Frontend Environment (`.env`)
```env
# Google OAuth Client ID (from Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=558426781456-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

#### Backend Environment (Optional - for server-side flow)
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. OAuth Callback Page

The callback page (`public/oauth-callback.html`) handles the OAuth redirect:

```html
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Callback</title>
</head>
<body>
    <script>
        // Parse OAuth response from URL fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        const error = params.get('error');
        
        // Send message to parent window
        if (window.opener) {
            if (error) {
                window.opener.postMessage({
                    type: 'oauth-error',
                    error: error
                }, window.location.origin);
            } else if (accessToken) {
                window.opener.postMessage({
                    type: 'oauth-success',
                    accessToken: accessToken,
                    expiresIn: expiresIn ? parseInt(expiresIn) : null
                }, window.location.origin);
            }
            window.close();
        }
    </script>
    <p>Processing authentication... This window will close automatically.</p>
</body>
</html>
```

## Frontend Implementation

### OAuth Service

The `oauthService` handles the authentication flow:

```typescript
// src/services/oauthService.ts

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

class OAuthService {
  async authenticateGoogle(): Promise<OAuthResult> {
    return new Promise((resolve, reject) => {
      if (!GOOGLE_CLIENT_ID) {
        reject(new Error('Google Client ID not configured'));
        return;
      }

      // Build OAuth URL
      const redirectUri = `${window.location.origin}/oauth-callback.html`;
      const scope = 'https://www.googleapis.com/auth/drive.readonly';
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('prompt', 'select_account');

      // Open popup window
      const popup = window.open(authUrl.toString(), 'Google Sign In', 
        'width=500,height=600');

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth-success') {
          window.removeEventListener('message', handleMessage);
          resolve({
            success: true,
            provider: 'google_drive',
            accessToken: event.data.accessToken,
            expiresIn: event.data.expiresIn
          });
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }
}
```

### Usage in Components

```tsx
// src/components/bulk-processing/CloudSourceConfigSimple.tsx

import { oauthService } from '@/services/oauthService';

const handleSignIn = async () => {
  try {
    const result = await oauthService.authenticate('google_drive');
    
    if (result.success) {
      // Save token to localStorage
      localStorage.setItem('google_drive_access_token', result.accessToken);
      
      // Update config with token
      onChange({
        ...config,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      
      toast({ title: 'Successfully connected to Google Drive!' });
    }
  } catch (error) {
    toast({
      title: 'Authentication failed',
      description: error.message,
      variant: 'destructive'
    });
  }
};
```

## Backend Integration

### Job Creation with Google Drive

When creating a bulk job with Google Drive as the source:

```typescript
const jobData = {
  name: "My Google Drive Job",
  source_type: "google_drive",
  source_config: {
    access_token: "ya29.a0AfH6SMB...",  // From OAuth
    refresh_token: "1//0eX...",          // Optional
    folder_id: "1a2b3c4d5e6f",          // Optional - specific folder
    file_id: "1xyz...",                  // Optional - specific file
    file_name: "document.pdf",           // Optional - file name filter
    file_types: ["application/pdf"],     // MIME types to process
    recursive: true,                     // Include subfolders
    shared_drive_id: "0ABC..."          // Optional - shared drive
  },
  processing_config: {
    mode: "once",
    discovery_batch_size: 50
  }
};

const job = await bulkJobsApi.createJob(jobData);
await bulkJobsApi.startJob(job.id);
```

### Backend Processing

The backend uses the access token to interact with Google Drive API:

```python
# backend-bulk/app/services/sources/google_drive_adapter.py

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

class GoogleDriveAdapter:
    def __init__(self, config: dict):
        # Build credentials from access token
        creds = Credentials(token=config['access_token'])
        
        if 'refresh_token' in config:
            creds.refresh_token = config['refresh_token']
        
        # Create Drive API service
        self.service = build('drive', 'v3', credentials=creds)
    
    def discover_files(self) -> List[dict]:
        # Query Google Drive for files
        query = "mimeType='application/pdf'"
        
        if self.config.get('folder_id'):
            query += f" and '{self.config['folder_id']}' in parents"
        
        results = self.service.files().list(
            q=query,
            fields="files(id, name, mimeType, size)",
            pageSize=100
        ).execute()
        
        return results.get('files', [])
    
    def download_file(self, file_id: str) -> bytes:
        # Download file content
        request = self.service.files().get_media(fileId=file_id)
        content = request.execute()
        return content
```

## User Experience Flow

### Step 1: Navigate to Bulk Processing
- User clicks on "Create Bulk Job"
- Selects "Google Drive" tab

### Step 2: Authentication
- User clicks "Sign in with Google"
- Popup window opens with Google sign-in
- User selects Google account and grants permissions
- Popup closes automatically
- UI shows "Connected to Google Drive" status

### Step 3: Folder/File Selection
- User can browse their Google Drive folders
- Select a specific folder or the entire Drive
- Optionally select a single file
- Choose to include subfolders (recursive)

### Step 4: Job Creation
- User provides job name
- Configures processing options
- Clicks "Create and Start Job"
- Job begins processing files from Google Drive

## Google Drive Folder Browser

### Features
- Hierarchical folder navigation
- Breadcrumb navigation
- Search functionality
- File/folder selection
- Loading states and error handling

### Usage Example

```tsx
<GoogleDriveFolderBrowser
  accessToken={gdConfig.accessToken || ''}
  onSelectFolder={(folderId, folderName) => {
    onChange({ ...config, folderId });
    toast({ title: 'Folder selected', description: folderName });
  }}
  onSelectFile={(fileId, fileName) => {
    onChange({ ...config, fileId, fileName });
    toast({ title: 'File selected', description: fileName });
  }}
  selectedFolderId={gdConfig.folderId}
  selectedFileId={gdConfig.fileId}
  showFiles={true}
  allowFileSelection={true}
/>
```

## Token Management

### Storage
- **Access Token**: Stored in `localStorage` with key `google_drive_access_token`
- **Refresh Token**: Stored in `localStorage` with key `google_drive_refresh_token`

### Expiration
- Access tokens typically expire after 1 hour
- Refresh tokens can be used to obtain new access tokens
- Backend handles token refresh automatically when using refresh tokens

### Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit credentials**: Don't include Client ID/Secret in version control
2. **Use environment variables**: Store sensitive values in `.env` files
3. **HTTPS in production**: Always use HTTPS for OAuth redirects
4. **Token storage**: Consider using secure storage instead of localStorage for production
5. **Minimal scopes**: Only request necessary permissions (we use `drive.readonly`)
6. **Token transmission**: Tokens sent to backend should use HTTPS
7. **Backend validation**: Backend should validate tokens with Google

## Troubleshooting

### Issue: "Google Client ID not configured"
**Solution**: Ensure `VITE_GOOGLE_CLIENT_ID` is set in your `.env` file

### Issue: "Popup blocked"
**Solution**: Allow popups for your domain in browser settings

### Issue: "Redirect URI mismatch"
**Solution**: 
- Check that the redirect URI in Google Cloud Console matches exactly
- Include the port number (e.g., `http://localhost:5173/oauth-callback.html`)
- Clear browser cache and try again

### Issue: "Access token expired"
**Solution**: 
- Implement token refresh logic
- User needs to re-authenticate if refresh token is unavailable

### Issue: "Insufficient permissions"
**Solution**: 
- Verify the scope includes `drive.readonly`
- User may need to re-authenticate to grant new permissions

### Issue: "Files not appearing in browser"
**Solution**:
- Check that user has granted Drive permissions
- Verify the folder ID is correct
- Check browser console for API errors

## API Scopes

### Current Scope
```
https://www.googleapis.com/auth/drive.readonly
```
- Read-only access to user's Drive files
- Can list and download files
- Cannot modify or delete files

### Additional Scopes (if needed)
```
https://www.googleapis.com/auth/drive.metadata.readonly  # Metadata only
https://www.googleapis.com/auth/drive.file                # Per-file access
https://www.googleapis.com/auth/drive                     # Full access
```

## Testing

### Manual Testing Checklist

- [ ] OAuth popup opens correctly
- [ ] User can sign in and grant permissions
- [ ] Popup closes after authentication
- [ ] Access token is received and stored
- [ ] UI shows "Connected" status
- [ ] Folder browser loads Drive contents
- [ ] Can navigate folders
- [ ] Can select folder/file
- [ ] Job creation includes correct config
- [ ] Backend receives access token
- [ ] Backend can list files from Drive
- [ ] Backend can download files from Drive

### Testing with Different Accounts

1. **Test with personal Google account**
2. **Test with Google Workspace account**
3. **Test with shared drives** (if applicable)
4. **Test with restricted folders**
5. **Test token expiration** (wait 1 hour)

## Deployment Considerations

### Production Checklist

- [ ] Register production domain in Google Cloud Console
- [ ] Add production redirect URIs
- [ ] Update OAuth consent screen with privacy policy
- [ ] Request verification if needed (for public apps)
- [ ] Use HTTPS for all OAuth flows
- [ ] Implement proper error handling
- [ ] Add token refresh logic
- [ ] Monitor OAuth usage and errors
- [ ] Set up rate limiting
- [ ] Implement token revocation endpoint

### Environment-Specific Configuration

**Development**:
```env
VITE_GOOGLE_CLIENT_ID=558426781456-dev.apps.googleusercontent.com
```

**Production**:
```env
VITE_GOOGLE_CLIENT_ID=558426781456-prod.apps.googleusercontent.com
```

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google Cloud Console](https://console.cloud.google.com)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check backend logs for API errors
4. Verify Google Cloud Console configuration
5. Test with a fresh Google account

## Future Enhancements

- [ ] Implement token refresh logic
- [ ] Add support for multiple Google accounts
- [ ] Implement file preview in browser
- [ ] Add batch file selection
- [ ] Support for Google Sheets, Docs conversion to PDF
- [ ] Integration with Google Shared Drives
- [ ] Advanced filtering (by date, size, owner)
- [ ] Caching of folder structure
- [ ] Offline token storage for background jobs

---

**Last Updated**: December 9, 2025  
**Version**: 1.0  
**Maintainer**: DocuFlow Team
