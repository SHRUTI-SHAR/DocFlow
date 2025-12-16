"""
Bucket Manager Service
Manages Supabase storage bucket for documents.
All documents are stored in a single 'documents' bucket.
"""

import logging
from typing import Dict, Any
from supabase import Client

logger = logging.getLogger(__name__)

# Single bucket for all documents
DEFAULT_BUCKET = "documents"


class BucketManager:
    """
    Manages Supabase storage bucket for documents.
    All documents are stored in a single 'documents' bucket.
    """
    
    def __init__(self, supabase_client: Client):
        """
        Initialize bucket manager with Supabase client.
        
        Args:
            supabase_client: Initialized Supabase client
        """
        self.supabase = supabase_client
        self._bucket_verified = False
    
    async def get_or_create_bucket(
        self, 
        document_type: str = None,
        public: bool = False
    ) -> Dict[str, Any]:
        """
        Get the documents bucket (creates if not exists).
        All documents use the same 'documents' bucket regardless of type.
        
        Args:
            document_type: Ignored - kept for backward compatibility
            public: Whether bucket should be public
            
        Returns:
            Dict with bucket info (name, created, error if any)
        """
        try:
            # Check if already verified
            if self._bucket_verified:
                return {
                    "bucket_name": DEFAULT_BUCKET,
                    "created": False,
                    "cached": True
                }
            
            # Check if bucket exists
            existing = await self._bucket_exists(DEFAULT_BUCKET)
            
            if existing:
                self._bucket_verified = True
                logger.info(f"Bucket '{DEFAULT_BUCKET}' verified")
                return {
                    "bucket_name": DEFAULT_BUCKET,
                    "created": False,
                    "cached": False
                }
            
            # Create the documents bucket
            result = await self._create_bucket(DEFAULT_BUCKET, public)
            
            if result["success"]:
                self._bucket_verified = True
                logger.info(f"Created bucket: {DEFAULT_BUCKET}")
                
            return {
                "bucket_name": DEFAULT_BUCKET,
                "created": result["success"],
                "error": result.get("error")
            }
            
        except Exception as e:
            logger.error(f"Error in get_or_create_bucket: {e}")
            return {
                "bucket_name": DEFAULT_BUCKET,
                "created": False,
                "error": str(e)
            }
    
    async def _bucket_exists(self, bucket_name: str) -> bool:
        """Check if a bucket exists in Supabase storage."""
        try:
            # List all buckets and check if ours exists
            buckets = self.supabase.storage.list_buckets()
            return any(b.name == bucket_name for b in buckets)
        except Exception as e:
            logger.error(f"Error checking bucket existence: {e}")
            return False
    
    async def _create_bucket(
        self, 
        bucket_name: str, 
        public: bool = False
    ) -> Dict[str, Any]:
        """Create a new storage bucket."""
        try:
            self.supabase.storage.create_bucket(
                bucket_name,
                options={
                    "public": public,
                    "allowed_mime_types": [
                        "application/pdf",
                        "image/jpeg",
                        "image/png",
                        "image/webp"
                    ],
                    "file_size_limit": 52428800  # 50MB
                }
            )
            return {"success": True}
        except Exception as e:
            error_msg = str(e)
            # If bucket already exists, that's fine
            if "already exists" in error_msg.lower():
                return {"success": True}
            logger.error(f"Error creating bucket {bucket_name}: {e}")
            return {"success": False, "error": error_msg}
    
    async def upload_to_bucket(
        self,
        bucket_name: str = None,
        file_path: str = "",
        file_bytes: bytes = b"",
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        Upload file to the documents bucket.
        
        Args:
            bucket_name: Ignored - all files go to 'documents' bucket (kept for backward compatibility)
            file_path: Path within bucket
            file_bytes: File content
            content_type: MIME type
            
        Returns:
            Upload result with public URL if successful
        """
        try:
            # Ensure documents bucket exists
            await self.get_or_create_bucket()
            
            # Always upload to 'documents' bucket
            result = self.supabase.storage.from_(DEFAULT_BUCKET).upload(
                file_path,
                file_bytes,
                {"content-type": content_type}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_(DEFAULT_BUCKET).get_public_url(
                file_path
            )
            
            return {
                "success": True,
                "bucket": DEFAULT_BUCKET,
                "path": file_path,
                "public_url": public_url
            }
            
        except Exception as e:
            error_msg = str(e)
            # Handle duplicate file
            if "duplicate" in error_msg.lower() or "already exists" in error_msg.lower():
                public_url = self.supabase.storage.from_(DEFAULT_BUCKET).get_public_url(
                    file_path
                )
                return {
                    "success": True,
                    "bucket": DEFAULT_BUCKET,
                    "path": file_path,
                    "public_url": public_url,
                    "already_existed": True
                }
            
            logger.error(f"Error uploading to bucket: {e}")
            return {
                "success": False,
                "error": error_msg
            }
    
    async def list_buckets(self) -> list:
        """List the documents bucket."""
        try:
            buckets = self.supabase.storage.list_buckets()
            return [
                {
                    "name": b.name,
                    "public": b.public,
                    "created_at": b.created_at
                }
                for b in buckets
                if b.name == DEFAULT_BUCKET
            ]
        except Exception as e:
            logger.error(f"Error listing buckets: {e}")
            return []
    
    async def get_bucket_stats(self, bucket_name: str = None) -> Dict[str, Any]:
        """Get statistics for the documents bucket."""
        try:
            files = self.supabase.storage.from_(DEFAULT_BUCKET).list()
            total_size = sum(f.get("metadata", {}).get("size", 0) for f in files)
            
            return {
                "bucket_name": DEFAULT_BUCKET,
                "file_count": len(files),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
        except Exception as e:
            logger.error(f"Error getting bucket stats: {e}")
            return {
                "bucket_name": DEFAULT_BUCKET,
                "error": str(e)
            }
