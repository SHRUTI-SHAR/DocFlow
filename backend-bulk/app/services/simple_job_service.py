"""
Simple Job Service for asyncpg
Creates jobs and documents without ORM
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import asyncpg
from app.core.config import settings

logger = logging.getLogger(__name__)


class SimpleJobService:
    """Lightweight job service using asyncpg"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def _get_pool(self) -> asyncpg.Pool:
        """Get or create connection pool"""
        if not self.pool:
            self.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=1,
                max_size=5,  # Transaction pooler handles actual pooling
                max_inactive_connection_lifetime=60,
                command_timeout=30,
                statement_cache_size=0,  # CRITICAL: Disable prepared statements for pgbouncer
            )
        return self.pool
    
    async def create_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bulk processing job"""
        pool = await self._get_pool()
        job_id = str(uuid.uuid4())
        
        # Extract config parts
        config = job_data.get("config", {})
        source_config = config.get("source", {"type": "folder", "files": []})
        processing_config = config.get("processing", {"mode": "once", "discovery_batch_size": 10})
        processing_options = config.get("processingOptions", {
            "priority": 3,
            "max_retries": 3,
            "parallel_workers": 10
        })
        
        # Map source type - 'upload' is treated as 'folder' for database constraint
        source_type = source_config.get("type", "folder")
        if source_type == "upload":
            source_type = "folder"  # Use 'folder' for uploaded files
        
        import json
        
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO bulk_jobs (
                    id, name, source_type, source_config, processing_config, processing_options,
                    status, total_documents, processed_documents, failed_documents, 
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, $10, NOW(), NOW())
            """, 
                uuid.UUID(job_id),
                job_data["name"],
                source_type,  # Use mapped source_type
                json.dumps(source_config),
                json.dumps(processing_config),
                json.dumps(processing_options),
                "pending",
                0,
                0,
                0
            )
            
            logger.info(f"✅ Created job: {job_id} - {job_data['name']}")
            
            return {
                "id": job_id,
                "name": job_data["name"],
                "sourceType": source_config.get("type", "folder"),
                "sourceConfig": source_config,
                "processingConfig": processing_config,
                "processingOptions": processing_options,
                "status": "pending",
                "totalDocuments": 0,
                "processedDocuments": 0,
                "failedDocuments": 0,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat()
            }
    
    async def create_document(self, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a document entry for a job"""
        pool = await self._get_pool()
        doc_id = str(uuid.uuid4())
        
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO bulk_job_documents (
                    id, job_id, filename, source_path, status, 
                    priority, retry_count, max_retries, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            """,
                uuid.UUID(doc_id),
                uuid.UUID(doc_data["job_id"]),
                doc_data["filename"],
                doc_data["source_path"],
                doc_data.get("status", "pending"),
                3,  # default priority
                0,  # retry_count
                3   # max_retries
            )
            
            # Update job's total_documents count
            await conn.execute("""
                UPDATE bulk_jobs 
                SET total_documents = total_documents + 1,
                    updated_at = NOW()
                WHERE id = $1
            """, uuid.UUID(doc_data["job_id"]))
            
            logger.info(f"✅ Created document: {doc_id} - {doc_data['filename']}")
            
            return {
                "id": doc_id,
                "jobId": doc_data["job_id"],
                "filename": doc_data["filename"],
                "name": doc_data["filename"],
                "sourcePath": doc_data["source_path"],
                "status": doc_data.get("status", "pending"),
                "retryCount": 0,
                "createdAt": datetime.utcnow().isoformat()
            }
    
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()


# Singleton instance
_job_service: Optional[SimpleJobService] = None


def get_simple_job_service() -> SimpleJobService:
    """Get or create job service instance"""
    global _job_service
    if not _job_service:
        _job_service = SimpleJobService()
    return _job_service
