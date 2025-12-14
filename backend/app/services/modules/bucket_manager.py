"""
Dynamic Bucket Manager Service
Manages Supabase storage buckets dynamically based on document types
"""

import logging
import re
from typing import Optional, Dict, Any, List
from supabase import Client

logger = logging.getLogger(__name__)


class BucketManager:
    """
    Manages dynamic Supabase storage buckets for different document types.
    Creates buckets on-demand when new document types are detected.
    """
    
    def __init__(self, supabase_client: Client):
        """
        Initialize bucket manager with Supabase client.
        
        Args:
            supabase_client: Initialized Supabase client
        """
        self.supabase = supabase_client
        self._bucket_cache: Dict[str, bool] = {}
        
    def _normalize_bucket_name(self, name: str) -> str:
        """
        Normalize bucket name to valid Supabase bucket format.
        
        Args:
            name: Raw bucket name
            
        Returns:
            Normalized bucket name (lowercase, hyphens, no special chars)
        """
        # Convert to lowercase
        normalized = name.lower()
        # Replace spaces and underscores with hyphens
        normalized = re.sub(r'[\s_]+', '-', normalized)
        # Remove any characters that aren't alphanumeric or hyphens
        normalized = re.sub(r'[^a-z0-9-]', '', normalized)
        # Remove consecutive hyphens
        normalized = re.sub(r'-+', '-', normalized)
        # Remove leading/trailing hyphens
        normalized = normalized.strip('-')
        
        # Ensure bucket name is not empty
        if not normalized:
            normalized = "documents"
            
        return normalized
    
    async def get_or_create_bucket(
        self, 
        document_type: str,
        public: bool = False
    ) -> Dict[str, Any]:
        """
        Get existing bucket or create new one for document type.
        
        Args:
            document_type: Document type slug (e.g., "pan-card")
            public: Whether bucket should be public
            
        Returns:
            Dict with bucket info (name, created, error if any)
        """
        bucket_name = f"{self._normalize_bucket_name(document_type)}-documents"
        
        try:
            # Check cache first
            if bucket_name in self._bucket_cache:
                logger.debug(f"Bucket {bucket_name} found in cache")
                return {
                    "bucket_name": bucket_name,
                    "created": False,
                    "cached": True
                }
            
            # Check if bucket exists
            existing = await self._bucket_exists(bucket_name)
            
            if existing:
                self._bucket_cache[bucket_name] = True
                logger.info(f"Bucket {bucket_name} already exists")
                return {
                    "bucket_name": bucket_name,
                    "created": False,
                    "cached": False
                }
            
            # Create new bucket
            result = await self._create_bucket(bucket_name, public)
            
            if result["success"]:
                self._bucket_cache[bucket_name] = True
                logger.info(f"Created new bucket: {bucket_name}")
                
                # Register bucket in document_types table
                await self._register_document_type(document_type, bucket_name)
                
            return {
                "bucket_name": bucket_name,
                "created": result["success"],
                "error": result.get("error")
            }
            
        except Exception as e:
            logger.error(f"Error in get_or_create_bucket: {e}")
            return {
                "bucket_name": bucket_name,
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
    
    async def _register_document_type(
        self, 
        document_type: str, 
        bucket_name: str
    ) -> None:
        """Register document type in database if not exists."""
        try:
            # Check if already registered
            result = self.supabase.table("document_types").select("*").eq(
                "name", document_type
            ).execute()
            
            if not result.data:
                # Insert new document type
                display_name = document_type.replace("-", " ").title()
                self.supabase.table("document_types").insert({
                    "name": document_type,
                    "display_name": display_name,
                    "bucket_name": bucket_name,
                    "icon": "FileText",
                    "color": "#6366f1"
                }).execute()
                logger.info(f"Registered new document type: {document_type}")
                
        except Exception as e:
            # Table might not exist yet, log but don't fail
            logger.warning(f"Could not register document type: {e}")
    
    async def upload_to_bucket(
        self,
        bucket_name: str,
        file_path: str,
        file_bytes: bytes,
        content_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        Upload file to specified bucket.
        
        Args:
            bucket_name: Target bucket name
            file_path: Path within bucket
            file_bytes: File content
            content_type: MIME type
            
        Returns:
            Upload result with public URL if successful
        """
        try:
            # Ensure bucket exists
            await self.get_or_create_bucket(
                bucket_name.replace("-documents", "")
            )
            
            # Upload file
            result = self.supabase.storage.from_(bucket_name).upload(
                file_path,
                file_bytes,
                {"content-type": content_type}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_(bucket_name).get_public_url(
                file_path
            )
            
            return {
                "success": True,
                "bucket": bucket_name,
                "path": file_path,
                "public_url": public_url
            }
            
        except Exception as e:
            error_msg = str(e)
            # Handle duplicate file
            if "duplicate" in error_msg.lower() or "already exists" in error_msg.lower():
                public_url = self.supabase.storage.from_(bucket_name).get_public_url(
                    file_path
                )
                return {
                    "success": True,
                    "bucket": bucket_name,
                    "path": file_path,
                    "public_url": public_url,
                    "already_existed": True
                }
            
            logger.error(f"Error uploading to bucket: {e}")
            return {
                "success": False,
                "error": error_msg
            }
    
    async def list_buckets(self) -> List[Dict[str, Any]]:
        """List all document type buckets."""
        try:
            buckets = self.supabase.storage.list_buckets()
            return [
                {
                    "name": b.name,
                    "public": b.public,
                    "created_at": b.created_at
                }
                for b in buckets
                if b.name.endswith("-documents")
            ]
        except Exception as e:
            logger.error(f"Error listing buckets: {e}")
            return []
    
    async def get_bucket_stats(self, bucket_name: str) -> Dict[str, Any]:
        """Get statistics for a bucket."""
        try:
            files = self.supabase.storage.from_(bucket_name).list()
            total_size = sum(f.get("metadata", {}).get("size", 0) for f in files)
            
            return {
                "bucket_name": bucket_name,
                "file_count": len(files),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
        except Exception as e:
            logger.error(f"Error getting bucket stats: {e}")
            return {
                "bucket_name": bucket_name,
                "error": str(e)
            }
