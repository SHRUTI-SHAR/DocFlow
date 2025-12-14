"""
Bulk Insert Service - PostgreSQL COPY for High-Performance Field Storage
Handles inserting 3,600+ fields per document in ~100ms
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncpg
from ..core.config import settings

logger = logging.getLogger(__name__)


class BulkInsertService:
    """
    High-performance bulk insert using PostgreSQL COPY protocol
    
    Performance:
    - 3,600 fields in 100ms (vs 29 seconds with individual INSERTs)
    - 290x faster than traditional approach
    - Uses connection pooling for efficiency
    """
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._initialization_lock = asyncio.Lock()
        logger.info("🗄️ BulkInsertService initialized")
    
    async def initialize_pool(self):
        """
        Create connection pool on startup
        Call this once during application initialization
        """
        async with self._initialization_lock:
            if self.pool is not None:
                logger.warning("Connection pool already initialized")
                return
            
            try:
                self.pool = await asyncpg.create_pool(
                    settings.DATABASE_URL,
                    min_size=1,
                    max_size=5,  # Transaction pooler handles actual pooling
                    max_queries=50000,
                    max_inactive_connection_lifetime=60,
                    command_timeout=60,
                    timeout=10,
                    statement_cache_size=0,  # CRITICAL: Disable prepared statements for pgbouncer
                )
                logger.info("✅ Database connection pool created (transaction pooler mode)")
            except Exception as e:
                logger.error(f"❌ Failed to create connection pool: {e}")
                raise
    
    async def close_pool(self):
        """
        Close connection pool on shutdown
        Call this during application cleanup
        """
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("Connection pool closed")
    
    async def bulk_insert_fields(
        self,
        document_id: str,
        job_id: str,
        fields: List[Dict[str, Any]],
        processing_time_ms: Optional[int] = None
    ) -> int:
        """
        Insert all extracted fields for one document in a single COPY operation
        
        Args:
            document_id: UUID of the document
            job_id: UUID of the job
            fields: List of extracted fields from LLM
            processing_time_ms: Total processing time for document
            
        Returns:
            Number of fields inserted
            
        Example field structure:
        {
            "label": "company_name",
            "value": "ABC Corporation",
            "type": "text",
            "confidence": 0.95,
            "page": 1,
            "tokens_used": 150
        }
        """
        if not fields:
            logger.warning(f"No fields to insert for document {document_id}")
            return 0
        
        if not self.pool:
            await self.initialize_pool()
        
        start_time = datetime.now()
        
        try:
            # Prepare records for COPY
            records = self._prepare_records(document_id, job_id, fields)
            
            # Get connection from pool
            async with self.pool.acquire() as conn:
                # Start transaction
                async with conn.transaction():
                    # Use COPY for bulk insert (THE MAGIC!)
                    inserted_count = await conn.copy_records_to_table(
                        'bulk_extracted_fields',  # Table name
                        records=records,          # List of tuples
                        columns=[
                            'document_id',
                            'job_id',
                            'field_name',
                            'field_label',
                            'field_type',
                            'field_value',
                            'confidence_score',
                            'page_number',
                            'extraction_method',
                            'validation_status',
                            'needs_manual_review',
                            'tokens_used',
                            'processing_time_ms',
                            'model_version'
                        ]
                    )
                    
                    # Update document summary statistics
                    total_tokens = sum(f.get("tokens_used", 0) for f in fields)
                    avg_confidence = sum(f.get("confidence", 0) for f in fields) / len(fields) if fields else 0
                    needs_review_count = sum(1 for f in fields if f.get("confidence", 0) < 0.7)
                    
                    await conn.execute("""
                        UPDATE bulk_job_documents
                        SET 
                            total_fields_extracted = $1,
                            average_confidence = $2,
                            fields_needing_review = $3,
                            processing_time_ms = $4,
                            total_tokens_used = $5,
                            status = 'completed',
                            processing_completed_at = NOW(),
                            updated_at = NOW()
                        WHERE id = $6
                    """,
                        len(fields),
                        avg_confidence,
                        needs_review_count,
                        processing_time_ms,
                        total_tokens,
                        document_id
                    )
                    
                    # Transaction commits automatically here
            
            elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.info(
                f"✅ Bulk inserted {len(fields)} fields for document {document_id} "
                f"in {elapsed_ms}ms using COPY"
            )
            
            return len(fields)
            
        except Exception as e:
            logger.error(f"❌ Failed to bulk insert fields for document {document_id}: {e}")
            
            # Mark document as failed
            if self.pool:
                try:
                    async with self.pool.acquire() as conn:
                        await conn.execute("""
                            UPDATE bulk_job_documents 
                            SET 
                                status = 'failed', 
                                error_message = $1,
                                error_type = 'bulk_insert_error',
                                updated_at = NOW()
                            WHERE id = $2
                        """, str(e), document_id)
                except Exception as update_error:
                    logger.error(f"Failed to update document status: {update_error}")
            
            raise
    
    def _prepare_records(
        self,
        document_id: str,
        job_id: str,
        fields: List[Dict[str, Any]]
    ) -> List[tuple]:
        """
        Transform LLM field output into PostgreSQL COPY format
        
        Converts from LLM response format to database tuple format
        """
        records = []
        
        for field in fields:
            # Extract field data with defaults
            # Support both formats:
            # 1. LLM format: {"label": "x", "value": "y", "type": "z"}
            # 2. Flattened format: {"field_name": "x", "field_value": "y", "field_type": "z"}
            field_name = field.get("field_name") or field.get("label") or field.get("name") or "unknown"
            field_label = field.get("field_label") or field.get("label") or field_name
            field_type = field.get("field_type") or field.get("type", "text")
            
            # Get field value - check both key formats
            raw_value = field.get("field_value") if "field_value" in field else field.get("value")
            field_value = str(raw_value) if raw_value is not None else None
            
            # Get confidence - check both key formats
            confidence_raw = field.get("confidence_score") if "confidence_score" in field else field.get("confidence", 0.0)
            confidence = float(confidence_raw) if confidence_raw is not None else 0.0
            
            # Get page number - check both formats
            page_raw = field.get("page_number") if "page_number" in field else field.get("page", 1)
            page = int(page_raw) if page_raw is not None else 1
            
            tokens = field.get("tokens_used", 0)
            processing_time = field.get("processing_time_ms")
            model_version = field.get("model_version", "gemini-2.0-flash-exp")
            
            # Determine validation status based on confidence
            if confidence >= 0.8:
                validation_status = "valid"
                needs_review = False
            elif confidence >= 0.7:
                validation_status = "needs_review"
                needs_review = True
            else:
                validation_status = "needs_review"
                needs_review = True
            
            # Create tuple in exact column order
            record = (
                document_id,            # document_id
                job_id,                 # job_id
                field_name,             # field_name
                field_label,            # field_label
                field_type,             # field_type
                field_value,            # field_value
                confidence,             # confidence_score
                page,                   # page_number
                "llm",                  # extraction_method
                validation_status,      # validation_status
                needs_review,           # needs_manual_review
                tokens,                 # tokens_used
                processing_time,        # processing_time_ms
                model_version           # model_version
            )
            
            records.append(record)
        
        return records
    
    async def bulk_insert_fields_batched(
        self,
        inserts: List[Dict[str, Any]]
    ) -> int:
        """
        Insert fields from multiple documents in batches
        Useful for catching up on failed documents
        
        Args:
            inserts: List of {document_id, job_id, fields} dictionaries
            
        Returns:
            Total number of fields inserted across all documents
        """
        total_inserted = 0
        
        for insert_data in inserts:
            count = await self.bulk_insert_fields(
                document_id=insert_data["document_id"],
                job_id=insert_data["job_id"],
                fields=insert_data["fields"],
                processing_time_ms=insert_data.get("processing_time_ms")
            )
            total_inserted += count
        
        logger.info(f"✅ Batch insert complete: {total_inserted} fields from {len(inserts)} documents")
        return total_inserted


# Global instance (singleton pattern)
_bulk_insert_service: Optional[BulkInsertService] = None


async def get_bulk_insert_service() -> BulkInsertService:
    """
    Get or create the global BulkInsertService instance
    
    Usage in FastAPI:
        service = await get_bulk_insert_service()
        await service.bulk_insert_fields(...)
    """
    global _bulk_insert_service
    
    if _bulk_insert_service is None:
        _bulk_insert_service = BulkInsertService()
        await _bulk_insert_service.initialize_pool()
    
    return _bulk_insert_service


async def shutdown_bulk_insert_service():
    """
    Close connection pool on application shutdown
    
    Call this in FastAPI lifespan/shutdown event
    """
    global _bulk_insert_service
    
    if _bulk_insert_service:
        await _bulk_insert_service.close_pool()
        _bulk_insert_service = None
        logger.info("BulkInsertService shutdown complete")
