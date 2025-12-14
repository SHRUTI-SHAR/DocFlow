"""
Review Queue Service - Business logic for manual review queue
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.models.schemas import ReviewQueueItemResponse, ReviewQueueListResponse
from app.models.database import BulkManualReviewQueue, BulkJobDocument
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)


class ReviewQueueService:
    """Service for managing manual review queue"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def list_items(
        self,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None
    ) -> ReviewQueueListResponse:
        """List review queue items"""
        try:
            # Join with document and job to get names
            from app.models.database import BulkJob
            query = select(
                BulkManualReviewQueue,
                BulkJobDocument.filename,
                BulkJobDocument.retry_count,
                BulkJob.name
            ).join(
                BulkJobDocument,
                BulkManualReviewQueue.document_id == BulkJobDocument.id
            ).join(
                BulkJob,
                BulkManualReviewQueue.job_id == BulkJob.id
            )
            
            # Apply status filter
            if status_filter:
                query = query.where(BulkManualReviewQueue.status == status_filter)
            
            # Get total count
            count_query = select(func.count()).select_from(BulkManualReviewQueue)
            if status_filter:
                count_query = count_query.where(BulkManualReviewQueue.status == status_filter)
            
            total_result = await self.db.execute(count_query)
            total = total_result.scalar()
            
            # Get paginated results (latest first, then by priority)
            query = query.order_by(
                BulkManualReviewQueue.created_at.desc(),
                BulkManualReviewQueue.priority.asc()
            ).offset(skip).limit(limit)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            # Build response with additional fields
            items = []
            for row in rows:
                queue_item = row[0]
                doc_filename = row[1]
                retry_count = row[2] or 0
                job_name = row[3]
                
                # Create dict from ORM object
                item_dict = {
                    'id': str(queue_item.id),
                    'document_id': str(queue_item.document_id),
                    'job_id': str(queue_item.job_id),
                    'reason': queue_item.reason,
                    'error_message': queue_item.error_message,
                    'error_type': queue_item.error_type,
                    'priority': queue_item.priority,
                    'status': queue_item.status,
                    'assigned_to': str(queue_item.assigned_to) if queue_item.assigned_to else None,
                    'review_notes': queue_item.review_notes,
                    'reviewed_at': queue_item.reviewed_at,
                    'reviewed_by': str(queue_item.reviewed_by) if queue_item.reviewed_by else None,
                    'created_at': queue_item.created_at,
                    'document_name': doc_filename,
                    'job_name': job_name,
                    'retry_count': retry_count,
                    'max_retries': 3,
                    'failed_at': queue_item.created_at
                }
                
                items.append(ReviewQueueItemResponse(**item_dict))
            
            return ReviewQueueListResponse(
                items=items,
                total=total,
                skip=skip,
                limit=limit
            )
        
        except Exception as e:
            logger.error(f"❌ Error listing review queue items: {e}")
            raise
    
    async def get_item(self, item_id: str) -> Optional[ReviewQueueItemResponse]:
        """Get a review queue item by ID"""
        try:
            from app.models.database import BulkJob
            result = await self.db.execute(
                select(
                    BulkManualReviewQueue,
                    BulkJobDocument.filename,
                    BulkJobDocument.retry_count,
                    BulkJob.name
                ).join(
                    BulkJobDocument,
                    BulkManualReviewQueue.document_id == BulkJobDocument.id
                ).join(
                    BulkJob,
                    BulkManualReviewQueue.job_id == BulkJob.id
                ).where(
                    BulkManualReviewQueue.id == uuid.UUID(item_id)
                )
            )
            row = result.one_or_none()
            
            if row:
                queue_item = row[0]
                doc_filename = row[1]
                retry_count = row[2] or 0
                job_name = row[3]
                
                item_dict = {
                    'id': str(queue_item.id),
                    'document_id': str(queue_item.document_id),
                    'job_id': str(queue_item.job_id),
                    'reason': queue_item.reason,
                    'error_message': queue_item.error_message,
                    'error_type': queue_item.error_type,
                    'priority': queue_item.priority,
                    'status': queue_item.status,
                    'assigned_to': str(queue_item.assigned_to) if queue_item.assigned_to else None,
                    'review_notes': queue_item.review_notes,
                    'reviewed_at': queue_item.reviewed_at,
                    'reviewed_by': str(queue_item.reviewed_by) if queue_item.reviewed_by else None,
                    'created_at': queue_item.created_at,
                    'document_name': doc_filename,
                    'job_name': job_name,
                    'retry_count': retry_count,
                    'max_retries': 3,
                    'failed_at': queue_item.created_at
                }
                
                return ReviewQueueItemResponse(**item_dict)
            return None
        
        except ValueError:
            return None
        except Exception as e:
            logger.error(f"❌ Error getting review item {item_id}: {e}")
            raise
    
    async def retry_item(self, item_id: str) -> Optional[ReviewQueueItemResponse]:
        """Retry processing from review queue"""
        try:
            # Get review queue item
            result = await self.db.execute(
                select(BulkManualReviewQueue).where(
                    BulkManualReviewQueue.id == uuid.UUID(item_id)
                )
            )
            item = result.scalar_one_or_none()
            
            if not item:
                raise ValueError(f"Review item {item_id} not found")
            
            # Store item details before deletion
            job_id = str(item.job_id)
            document_id = str(item.document_id)
            
            # Retry the document
            document_service = DocumentService(self.db)
            await document_service.retry_document(job_id, document_id)
            
            # Delete from review queue after successful retry
            await self.db.delete(item)
            await self.db.commit()
            
            logger.info(f"✅ Retried and removed document from review queue: {item_id}")
            # Return True to indicate success
            return True
        
        except ValueError:
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error retrying review item {item_id}: {e}")
            raise
    
    async def resolve_item(
        self,
        item_id: str,
        notes: Optional[str] = None
    ) -> Optional[ReviewQueueItemResponse]:
        """Resolve a review queue item (remove from queue)"""
        try:
            result = await self.db.execute(
                select(BulkManualReviewQueue).where(
                    BulkManualReviewQueue.id == uuid.UUID(item_id)
                )
            )
            item = result.scalar_one_or_none()
            
            if not item:
                raise ValueError(f"Review item {item_id} not found")
            
            # Delete from review queue
            await self.db.delete(item)
            await self.db.commit()
            
            logger.info(f"✅ Removed review queue item: {item_id}")
            return True
        
        except ValueError:
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error resolving review item {item_id}: {e}")
            raise

