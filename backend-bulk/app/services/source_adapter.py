"""
Source Adapter Interface
Abstract base class for different document sources
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class DocumentInfo:
    """Information about a discovered document"""
    source_path: str
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SourceAdapter(ABC):
    """Abstract base class for source adapters"""
    
    @abstractmethod
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """
        Discover documents from source
        
        Args:
            config: Source-specific configuration
            batch_size: Maximum number of documents to discover in one batch
        
        Returns:
            List of discovered documents
        """
        pass
    
    @abstractmethod
    def get_document_content(self, source_path: str) -> bytes:
        """
        Retrieve document content from source
        
        Args:
            source_path: Path to document in source
        
        Returns:
            Document content as bytes
        """
        pass
    
    @abstractmethod
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """
        Validate source configuration
        
        Args:
            config: Source configuration to validate
        
        Returns:
            True if valid, False otherwise
        """
        pass


class FolderSourceAdapter(SourceAdapter):
    """Adapter for local/network file system"""
    
    def count_documents(
        self,
        config: Dict[str, Any],
        max_count: Optional[int] = None
    ) -> int:
        """Count documents in folder or Supabase Storage (more efficient than discover_documents for large folders)"""
        import os
        from pathlib import Path
        
        folder_path = config.get("path")
        file_types = config.get("file_types", ["pdf", "jpg", "jpeg", "png"])
        recursive = config.get("recursive", True)
        
        if not folder_path:
            raise ValueError("Folder path is required")
        
        # Check if it's a Supabase Storage path
        if folder_path.startswith('supabase://'):
            from app.core.config import settings
            from supabase import create_client
            import os
            
            # Parse: supabase://backendbucket/session-id
            parts = folder_path.replace('supabase://', '').split('/', 1)
            bucket_name = parts[0] if len(parts) > 0 else settings.SUPABASE_STORAGE_BUCKET
            prefix = parts[1] if len(parts) > 1 else ""
            
            # Clear proxy environment variables to avoid httpx/supabase conflict
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
            saved_proxies = {}
            for var in proxy_vars:
                if var in os.environ:
                    saved_proxies[var] = os.environ.pop(var)
            
            try:
                supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                file_list = supabase.storage.from_(bucket_name).list(prefix)
                
                count = 0
                file_types_lower = [ext.lower().lstrip('.') for ext in file_types]
                
                for file_obj in file_list:
                    filename = file_obj.get('name', '')
                    ext = filename.split('.')[-1].lower() if '.' in filename else ''
                    if ext in file_types_lower:
                        count += 1
                        if max_count and count >= max_count:
                            return count
                
                return count
                
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"❌ Failed to count documents in Supabase Storage: {e}")
                raise ValueError(f"Failed to count documents in Supabase Storage: {e}")
            finally:
                # Restore proxy environment variables
                for var, value in saved_proxies.items():
                    os.environ[var] = value
        
        # Local folder path
        if not os.path.exists(folder_path):
            raise ValueError(f"Folder path does not exist: {folder_path}")
        
        path = Path(folder_path)
        
        # Normalize file types to lowercase for case-insensitive matching
        file_types_lower = [ext.lower() for ext in file_types]
        
        # Use a set to avoid counting the same file twice if it matches multiple patterns
        # (though this shouldn't happen, it's safer)
        found_files = set()
        
        # Count files - iterate through all files and check extension
        # This is more reliable than pattern matching, especially for case sensitivity
        if recursive:
            for file_path in path.rglob("*"):
                if file_path.is_file():
                    # Get file extension (case-insensitive)
                    ext = file_path.suffix.lower().lstrip('.')
                    if ext in file_types_lower:
                        found_files.add(file_path)
                        if max_count and len(found_files) >= max_count:
                            return len(found_files)
        else:
            for file_path in path.iterdir():
                if file_path.is_file():
                    # Get file extension (case-insensitive)
                    ext = file_path.suffix.lower().lstrip('.')
                    if ext in file_types_lower:
                        found_files.add(file_path)
                        if max_count and len(found_files) >= max_count:
                            return len(found_files)
        
        return len(found_files)
    
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """Discover documents from folder or Supabase Storage"""
        import os
        from pathlib import Path
        
        folder_path = config.get("path")
        file_types = config.get("file_types", ["pdf", "jpg", "jpeg", "png"])
        recursive = config.get("recursive", True)
        
        if not folder_path:
            raise ValueError("Folder path is required")
        
        # Check if it's a Supabase Storage path
        if folder_path.startswith('supabase://'):
            # Extract bucket and session path from supabase://bucket/session-id
            from app.core.config import settings
            from supabase import create_client
            import os as os_module
            
            # Parse: supabase://backendbucket/session-id
            parts = folder_path.replace('supabase://', '').split('/', 1)
            bucket_name = parts[0] if len(parts) > 0 else settings.SUPABASE_STORAGE_BUCKET
            prefix = parts[1] if len(parts) > 1 else ""
            
            # Clear proxy environment variables to avoid httpx/supabase conflict
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
            saved_proxies = {}
            for var in proxy_vars:
                if var in os_module.environ:
                    saved_proxies[var] = os_module.environ.pop(var)
            
            try:
                supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                
                # Try to load filename mapping
                filename_mapping = {}
                mapping_path = f"{prefix}/.filenames.json" if prefix else ".filenames.json"
                try:
                    mapping_content = supabase.storage.from_(bucket_name).download(mapping_path)
                    import json
                    filename_mapping = json.loads(mapping_content.decode('utf-8'))
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"✅ Loaded filename mapping with {len(filename_mapping)} entries")
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"⚠️ No filename mapping found: {e}")
                
                # List files in the bucket with prefix
                file_list = supabase.storage.from_(bucket_name).list(prefix)
                
                documents = []
                for file_obj in file_list:
                    storage_filename = file_obj.get('name', '')
                    
                    # Skip the mapping file itself
                    if storage_filename == '.filenames.json':
                        continue
                    
                    file_path = f"{prefix}/{storage_filename}" if prefix else storage_filename
                    
                    # Get original filename from mapping, fallback to storage filename
                    original_filename = filename_mapping.get(storage_filename, storage_filename)
                    
                    # Check file extension
                    ext = storage_filename.split('.')[-1].lower() if '.' in storage_filename else ''
                    if ext in [ft.lower().lstrip('.') for ft in file_types]:
                        documents.append(DocumentInfo(
                            source_path=file_path,  # Relative path in bucket (UUID filename)
                            filename=original_filename,  # Original filename for display
                            file_size=file_obj.get('metadata', {}).get('size'),
                            mime_type=file_obj.get('metadata', {}).get('mimetype', self._guess_mime_type(f'.{ext}'))
                        ))
                        
                        if len(documents) >= batch_size:
                            break
                
                return documents[:batch_size]
                
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"❌ Failed to discover documents from Supabase Storage: {e}")
                raise ValueError(f"Failed to discover documents from Supabase Storage: {e}")
            finally:
                # Restore proxy environment variables
                for var, value in saved_proxies.items():
                    os_module.environ[var] = value
        
        # Local folder path
        if not os.path.exists(folder_path):
            raise ValueError(f"Folder path does not exist: {folder_path}")
        
        documents = []
        path = Path(folder_path)
        
        # Normalize file types to lowercase for case-insensitive matching
        file_types_lower = [ext.lower() for ext in file_types]
        
        # Search for files - iterate through all files and check extension
        # This is more reliable than pattern matching, especially for case sensitivity
        if recursive:
            for file_path in path.rglob("*"):
                if file_path.is_file():
                    # Get file extension (case-insensitive)
                    ext = file_path.suffix.lower().lstrip('.')
                    if ext in file_types_lower:
                        documents.append(DocumentInfo(
                            source_path=str(file_path),
                            filename=file_path.name,
                            file_size=file_path.stat().st_size,
                            mime_type=self._guess_mime_type(file_path.suffix)
                        ))
                        if len(documents) >= batch_size:
                            break
        else:
            for file_path in path.iterdir():
                if file_path.is_file():
                    # Get file extension (case-insensitive)
                    ext = file_path.suffix.lower().lstrip('.')
                    if ext in file_types_lower:
                        documents.append(DocumentInfo(
                            source_path=str(file_path),
                            filename=file_path.name,
                            file_size=file_path.stat().st_size,
                            mime_type=self._guess_mime_type(file_path.suffix)
                        ))
                        if len(documents) >= batch_size:
                            break
        
        return documents[:batch_size]
    
    def get_document_content(self, source_path: str) -> bytes:
        """Read document from file system or Supabase Storage"""
        from app.core.config import settings
        import os as os_module
        
        # Check if path is a Supabase Storage path (format: session-id/file-id.pdf)
        # Supabase paths don't have full filesystem paths
        if '/' in source_path and not source_path.startswith('/') and '\\' not in source_path:
            # Likely a Supabase Storage path
            # Clear proxy environment variables to avoid httpx/supabase conflict
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
            saved_proxies = {}
            for var in proxy_vars:
                if var in os_module.environ:
                    saved_proxies[var] = os_module.environ.pop(var)
            
            try:
                from supabase import create_client
                supabase = create_client(
                    supabase_url=settings.SUPABASE_URL,
                    supabase_key=settings.SUPABASE_SERVICE_KEY
                )
                
                # Download from Supabase Storage
                response = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).download(source_path)
                return response
                
            except Exception as e:
                # Fallback to local if Supabase fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"⚠️ Failed to download from Supabase Storage: {e}. Trying local fallback...")
                
                # Try local fallback
                import os
                local_path = os.path.join('uploads/bulk-processing', source_path)
                if os.path.exists(local_path):
                    with open(local_path, 'rb') as f:
                        return f.read()
                raise ValueError(f"Document not found in Supabase Storage or local: {source_path}")
            finally:
                # Restore proxy environment variables
                for var, value in saved_proxies.items():
                    os_module.environ[var] = value
        
        # Local filesystem path
        with open(source_path, 'rb') as f:
            return f.read()
    
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """Validate folder source - supports local paths and Supabase Storage"""
        import os
        folder_path = config.get("path")
        if not folder_path:
            return False
        
        # Check if it's a Supabase Storage path (format: supabase://bucket/path)
        if folder_path.startswith('supabase://'):
            # For Supabase Storage, we trust the path is valid
            # Actual validation happens during discovery
            return True
        
        # For local paths, check if directory exists
        return os.path.exists(folder_path) and os.path.isdir(folder_path)
    
    def _guess_mime_type(self, suffix: str) -> str:
        """Guess MIME type from file extension"""
        mime_types = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
        }
        return mime_types.get(suffix.lower(), 'application/octet-stream')


class DatabaseSourceAdapter(SourceAdapter):
    """Adapter for database sources"""
    
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """Discover documents from database"""
        # TODO: Implement database discovery
        # 1. Execute query from config
        # 2. Parse results
        # 3. Return document info
        raise NotImplementedError("Database source adapter not yet implemented")
    
    def get_document_content(self, source_path: str) -> bytes:
        """Retrieve document from database"""
        # TODO: Implement database document retrieval
        raise NotImplementedError("Database source adapter not yet implemented")
    
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """Validate database source"""
        # TODO: Implement validation
        return config.get("query") is not None


class CloudSourceAdapter(SourceAdapter):
    """Adapter for cloud storage (S3, GCS, Azure Blob)"""
    
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """Discover documents from cloud storage"""
        # TODO: Implement cloud storage discovery
        raise NotImplementedError("Cloud source adapter not yet implemented")
    
    def get_document_content(self, source_path: str) -> bytes:
        """Retrieve document from cloud storage"""
        # TODO: Implement cloud storage retrieval
        raise NotImplementedError("Cloud source adapter not yet implemented")
    
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """Validate cloud storage source"""
        # TODO: Implement validation
        return config.get("bucket") is not None


class GoogleDriveSourceAdapter(SourceAdapter):
    """Adapter for Google Drive"""
    
    def __init__(self):
        self._service = None
        self._credentials = None
    
    def _get_service(self, config: Dict[str, Any]):
        """Initialize Google Drive service"""
        if self._service:
            return self._service
        
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials
            import json
        except ImportError:
            raise ImportError(
                "Google Drive support requires: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib"
            )
        
        creds = None
        
        # Option 1: Direct access token from frontend OAuth (Preferred)
        if config.get("access_token"):
            creds = Credentials(token=config["access_token"])
            
        # Option 2: Refresh token from frontend
        elif config.get("refresh_token"):
            creds = Credentials(
                token=None,
                refresh_token=config["refresh_token"],
                token_uri="https://oauth2.googleapis.com/token"
            )
            
        # Legacy options for backward compatibility
        elif config.get("credentials_json"):
            from google.oauth2 import service_account
            creds_dict = json.loads(config["credentials_json"])
            creds = service_account.Credentials.from_service_account_info(
                creds_dict,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
        elif config.get("credentials_file"):
            from google.oauth2 import service_account
            creds = service_account.Credentials.from_service_account_file(
                config["credentials_file"],
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
        elif config.get("token_file"):
            import os
            if os.path.exists(config["token_file"]):
                creds = Credentials.from_authorized_user_file(
                    config["token_file"],
                    ['https://www.googleapis.com/auth/drive.readonly']
                )
        else:
            raise ValueError("No valid credentials provided for Google Drive. Provide access_token, refresh_token, credentials_json, credentials_file, or token_file")
        
        self._credentials = creds
        self._service = build('drive', 'v3', credentials=creds)
        return self._service
    
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """Discover documents from Google Drive"""
        service = self._get_service(config)
        
        folder_id = config.get("folder_id")
        file_types = config.get("file_types", ["application/pdf", "image/jpeg", "image/png"])
        recursive = config.get("recursive", True)
        shared_drive_id = config.get("shared_drive_id")
        
        documents = []
        
        # Build query
        query_parts = []
        
        # Filter by folder
        if folder_id:
            query_parts.append(f"'{folder_id}' in parents")
        
        # Filter by MIME types
        if file_types:
            mime_queries = [f"mimeType='{mime}'" for mime in file_types]
            query_parts.append(f"({' or '.join(mime_queries)})")
        
        # Exclude trashed files
        query_parts.append("trashed=false")
        
        query = " and ".join(query_parts) if query_parts else None
        
        # Build request parameters
        params = {
            'pageSize': min(batch_size, 1000),
            'fields': 'files(id, name, mimeType, size, parents, createdTime, modifiedTime)',
            'q': query
        }
        
        if shared_drive_id:
            params['driveId'] = shared_drive_id
            params['includeItemsFromAllDrives'] = True
            params['supportsAllDrives'] = True
            params['corpora'] = 'drive'
        
        try:
            # Execute request
            results = service.files().list(**params).execute()
            files = results.get('files', [])
            
            for file in files[:batch_size]:
                documents.append(DocumentInfo(
                    source_path=file['id'],  # Store file ID as source_path
                    filename=file['name'],
                    file_size=int(file.get('size', 0)) if file.get('size') else None,
                    mime_type=file.get('mimeType'),
                    metadata={
                        'google_drive_id': file['id'],
                        'parents': file.get('parents', []),
                        'created_time': file.get('createdTime'),
                        'modified_time': file.get('modifiedTime')
                    }
                ))
            
            # TODO: Implement recursive discovery if needed
            # This would require iterating through subfolders
            
        except Exception as e:
            raise RuntimeError(f"Failed to discover Google Drive documents: {e}")
        
        return documents
    
    def get_document_content(self, source_path: str, config: Optional[Dict[str, Any]] = None) -> bytes:
        """
        Retrieve document content from Google Drive
        
        Args:
            source_path: File ID in Google Drive
            config: Source configuration (needed if service not initialized)
        
        Returns:
            Document content as bytes
        """
        # Initialize service if not already done
        if not self._service and config:
            self._get_service(config)
        
        if not self._service:
            raise RuntimeError("Google Drive service not initialized. Provide config parameter.")
        
        try:
            from googleapiclient.http import MediaIoBaseDownload
            import io
            
            # source_path is the file ID
            request = self._service.files().get_media(fileId=source_path)
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_buffer.seek(0)
            return file_buffer.read()
            
        except Exception as e:
            raise RuntimeError(f"Failed to download file from Google Drive: {e}")
    
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """Validate Google Drive source configuration"""
        # Check if at least one credential method is provided
        has_credentials = (
            config.get("access_token") or  # Frontend OAuth (preferred)
            config.get("refresh_token") or  # Frontend OAuth with refresh
            config.get("credentials_json") or
            config.get("credentials_file") or
            config.get("token_file")
        )
        
        if not has_credentials:
            return False
        
        # If using access_token, no need to validate further (already validated by frontend)
        if config.get("access_token"):
            return True
        
        try:
            # Try to initialize service to validate credentials
            self._get_service(config)
            return True
        except Exception:
            return False


class OneDriveSourceAdapter(SourceAdapter):
    """Adapter for Microsoft OneDrive / SharePoint"""
    
    def __init__(self):
        self._client = None
        self._access_token = None
    
    def _get_access_token(self, config: Dict[str, Any]) -> str:
        """Get access token for Microsoft Graph API"""
        
        # Option 1: Direct access token from frontend OAuth (Preferred)
        if config.get("access_token"):
            self._access_token = config["access_token"]
            return self._access_token
        
        # Option 2: Token file (legacy)
        if self._access_token:
            return self._access_token
        
        try:
            import json
            import os
        except ImportError:
            raise ImportError("OneDrive support requires: pip install requests")
        
        token_file = config.get("token_file")
        
        # Try to load token from file
        if token_file and os.path.exists(token_file):
            try:
                with open(token_file, 'r') as f:
                    token_data = json.load(f)
                    self._access_token = token_data.get('access_token')
                    return self._access_token
            except Exception:
                pass
        
        # Option 3: Client credentials flow (legacy - for service accounts)
        client_id = config.get("client_id")
        client_secret = config.get("client_secret")
        tenant_id = config.get("tenant_id")
        
        if client_secret and client_id and tenant_id:
            try:
                import msal
            except ImportError:
                raise ImportError("OneDrive support requires: pip install msal")
                
            authority = f"https://login.microsoftonline.com/{tenant_id}"
            app = msal.ConfidentialClientApplication(
                client_id,
                authority=authority,
                client_credential=client_secret
            )
            
            result = app.acquire_token_for_client(
                scopes=["https://graph.microsoft.com/.default"]
            )
            
            if "access_token" in result:
                self._access_token = result["access_token"]
                return self._access_token
            else:
                raise ValueError(f"Failed to acquire token: {result.get('error_description')}")
        
        raise ValueError("No valid authentication method provided for OneDrive. Provide access_token, token_file, or client credentials")
    
    def _make_graph_request(self, endpoint: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to Microsoft Graph API"""
        try:
            import requests
        except ImportError:
            raise ImportError("OneDrive support requires: pip install requests")
        
        token = self._get_access_token(config)
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"https://graph.microsoft.com/v1.0{endpoint}", headers=headers)
        response.raise_for_status()
        return response.json()
    
    def discover_documents(
        self,
        config: Dict[str, Any],
        batch_size: int = 50
    ) -> List[DocumentInfo]:
        """Discover documents from OneDrive"""
        folder_path = config.get("folder_path")
        file_types = config.get("file_types", [".pdf", ".jpg", ".jpeg", ".png"])
        drive_id = config.get("drive_id")
        site_id = config.get("site_id")
        
        documents = []
        
        # Build endpoint
        if site_id and drive_id:
            # SharePoint site
            endpoint = f"/sites/{site_id}/drives/{drive_id}/root"
        elif drive_id:
            # Specific drive
            endpoint = f"/drives/{drive_id}/root"
        else:
            # Default user drive
            endpoint = "/me/drive/root"
        
        # Add folder path if specified
        if folder_path:
            endpoint += f":/{folder_path.strip('/')}:"
        
        # List children
        endpoint += "/children"
        
        try:
            response = self._make_graph_request(endpoint, config)
            items = response.get('value', [])
            
            for item in items[:batch_size]:
                # Check if it's a file (not a folder)
                if 'file' in item:
                    # Check file extension
                    name = item.get('name', '')
                    ext = '.' + name.split('.')[-1].lower() if '.' in name else ''
                    
                    if ext in [ft.lower() for ft in file_types]:
                        documents.append(DocumentInfo(
                            source_path=item['id'],  # Store item ID as source_path
                            filename=name,
                            file_size=item.get('size'),
                            mime_type=item.get('file', {}).get('mimeType'),
                            metadata={
                                'onedrive_id': item['id'],
                                'web_url': item.get('webUrl'),
                                'created_time': item.get('createdDateTime'),
                                'modified_time': item.get('lastModifiedDateTime'),
                                'download_url': item.get('@microsoft.graph.downloadUrl')
                            }
                        ))
            
            # TODO: Implement recursive discovery and pagination if needed
            
        except Exception as e:
            raise RuntimeError(f"Failed to discover OneDrive documents: {e}")
        
        return documents
    
    def get_document_content(self, source_path: str) -> bytes:
        """Retrieve document content from OneDrive"""
        try:
            import requests
        except ImportError:
            raise ImportError("OneDrive support requires: pip install requests")
        
        # For OneDrive, we need to get the download URL first
        # source_path should contain the item ID
        # We'll need to pass config to get the token, but since we don't have it here,
        # we'll use the stored access token
        
        if not self._access_token:
            raise RuntimeError("OneDrive access token not available")
        
        headers = {
            'Authorization': f'Bearer {self._access_token}'
        }
        
        # Get download URL
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/me/drive/items/{source_path}",
            headers=headers
        )
        response.raise_for_status()
        
        download_url = response.json().get('@microsoft.graph.downloadUrl')
        
        if not download_url:
            raise RuntimeError("Failed to get download URL for OneDrive file")
        
        # Download file
        content_response = requests.get(download_url)
        content_response.raise_for_status()
        
        return content_response.content
    
    def validate_source(self, config: Dict[str, Any]) -> bool:
        """Validate OneDrive source configuration"""
        if not config.get("client_id") or not config.get("tenant_id"):
            return False
        
        # Check if we have either client_secret or token_file
        has_auth = config.get("client_secret") or config.get("token_file")
        
        if not has_auth:
            return False
        
        try:
            # Try to get access token to validate
            self._get_access_token(config)
            return True
        except Exception:
            return False


class SourceAdapterFactory:
    """Factory for creating source adapters"""
    
    @staticmethod
    def create(source_type: str) -> SourceAdapter:
        """
        Create a source adapter based on type
        
        Args:
            source_type: Type of source ('folder', 'database', 'cloud', 'google_drive', 'onedrive')
        
        Returns:
            Source adapter instance
        """
        adapters = {
            'folder': FolderSourceAdapter,
            'database': DatabaseSourceAdapter,
            'cloud': CloudSourceAdapter,
            'google_drive': GoogleDriveSourceAdapter,
            'onedrive': OneDriveSourceAdapter,
        }
        
        adapter_class = adapters.get(source_type.lower())
        if not adapter_class:
            raise ValueError(f"Unknown source type: {source_type}")
        
        return adapter_class()


def get_source_adapter(source_type: str = 'folder') -> SourceAdapter:
    """
    Helper function to get a source adapter
    
    Args:
        source_type: Type of source ('folder', 'database', 'cloud', 'google_drive', 'onedrive')
    
    Returns:
        Source adapter instance
    """
    return SourceAdapterFactory.create(source_type)

