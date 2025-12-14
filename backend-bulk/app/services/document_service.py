"""
Document Service - Business logic for bulk job documents
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.models.schemas import BulkJobDocumentResponse, BulkJobDocumentListResponse, DocumentStatus
from app.models.database import BulkJobDocument, BulkJob
from app.workers.processing import process_document

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing bulk job documents"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_documents(
        self,
        job_id: str,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None
    ) -> BulkJobDocumentListResponse:
        """List documents for a job"""
        try:
            # Verify job exists
            job_result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = job_result.scalar_one_or_none()
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            # Build query
            query = select(BulkJobDocument).where(
                BulkJobDocument.job_id == uuid.UUID(job_id)
            )
            
            # Apply status filter
            if status_filter:
                query = query.where(BulkJobDocument.status == status_filter)
            
            # Get total count
            count_query = select(func.count()).select_from(BulkJobDocument).where(
                BulkJobDocument.job_id == uuid.UUID(job_id)
            )
            if status_filter:
                count_query = count_query.where(BulkJobDocument.status == status_filter)
            
            total_result = await self.db.execute(count_query)
            total = total_result.scalar()
            
            # Get paginated results
            query = query.order_by(
                BulkJobDocument.priority.asc(),
                BulkJobDocument.created_at.desc()
            ).offset(skip).limit(limit)
            
            result = await self.db.execute(query)
            documents = result.scalars().all()
            
            return BulkJobDocumentListResponse(
                documents=[BulkJobDocumentResponse.from_orm(doc) for doc in documents],
                total=total,
                skip=skip,
                limit=limit
            )
        
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"❌ Error listing documents for job {job_id}: {e}")
            raise
    
    async def get_document(
        self,
        job_id: str,
        document_id: str
    ) -> Optional[BulkJobDocumentResponse]:
        """Get a document by ID"""
        try:
            result = await self.db.execute(
                select(BulkJobDocument).where(
                    and_(
                        BulkJobDocument.id == uuid.UUID(document_id),
                        BulkJobDocument.job_id == uuid.UUID(job_id)
                    )
                )
            )
            document = result.scalar_one_or_none()
            
            if document:
                return BulkJobDocumentResponse.from_orm(document)
            return None
        
        except ValueError:
            return None
        except Exception as e:
            logger.error(f"❌ Error getting document {document_id}: {e}")
            raise
    
    async def retry_document(
        self,
        job_id: str,
        document_id: str
    ) -> Optional[BulkJobDocumentResponse]:
        """Retry processing a document"""
        try:
            # Get document
            result = await self.db.execute(
                select(BulkJobDocument).where(
                    and_(
                        BulkJobDocument.id == uuid.UUID(document_id),
                        BulkJobDocument.job_id == uuid.UUID(job_id)
                    )
                )
            )
            document = result.scalar_one_or_none()
            
            if not document:
                return None
            
            # Check if document can be retried
            if document.status not in [DocumentStatus.FAILED.value, DocumentStatus.NEEDS_REVIEW.value]:
                raise ValueError(f"Cannot retry document in status: {document.status}")
            
            # Check retry limit
            if document.retry_count >= document.max_retries:
                raise ValueError(f"Document has reached max retries ({document.max_retries})")
            
            # Get job configuration
            job_result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = job_result.scalar_one()
            
            # Update document status
            document.status = DocumentStatus.QUEUED.value
            document.retry_count += 1
            document.error_message = None
            document.error_type = None
            document.queued_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(document)
            
            # Queue processing task
            try:
                job_config = {
                    "source_type": job.source_type,
                    "source_config": job.source_config,
                    "processing_options": job.processing_options
                }
                
                process_result = process_document.delay(
                    str(document.id),
                    str(job.id),
                    job_config
                )
                logger.info(f"🔄 Queued retry task for document {document_id}: {process_result.id}")
            
            except Exception as e:
                logger.error(f"❌ Error queueing retry task: {e}")
                # Revert status
                document.status = DocumentStatus.FAILED.value
                await self.db.commit()
                raise
            
            logger.info(f"✅ Retried document: {document_id}")
            return BulkJobDocumentResponse.from_orm(document)
        
        except ValueError as e:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error retrying document {document_id}: {e}")
            raise

