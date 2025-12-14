"""
Fields Service - Business logic for extracted field operations
Handles CRUD operations for bulk_extracted_fields table
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from app.models.database import BulkExtractedField, BulkJobDocument

logger = logging.getLogger(__name__)


class FieldsService:
    """Service for managing extracted fields"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_document_fields(
        self,
        document_id: str,
        page_number: Optional[int] = None,
        group_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Get all extracted fields for a document
        
        Args:
            document_id: Document UUID
            page_number: Optional page filter
            group_name: Optional group filter
            skip: Pagination offset
            limit: Max results
        
        Returns:
            Dict with fields array, total count, and document info
        """
        try:
            doc_uuid = uuid.UUID(document_id)
            
            # Build query
            query = select(BulkExtractedField).where(
                BulkExtractedField.document_id == doc_uuid
            )
            
            # Apply filters
            if page_number is not None:
                query = query.where(BulkExtractedField.page_number == page_number)
            
            if group_name is not None:
                query = query.where(BulkExtractedField.field_group == group_name)
            
            # Get total count
            count_query = select(func.count()).select_from(BulkExtractedField).where(
                BulkExtractedField.document_id == doc_uuid
            )
            if page_number is not None:
                count_query = count_query.where(BulkExtractedField.page_number == page_number)
            if group_name is not None:
                count_query = count_query.where(BulkExtractedField.field_group == group_name)
            
            total_result = await self.db.execute(count_query)
            total = total_result.scalar() or 0
            
            # Get paginated results ordered by page, then by field_order to preserve document order
            query = query.order_by(
                BulkExtractedField.page_number.asc(),
                BulkExtractedField.field_order.asc().nullslast(),
                BulkExtractedField.created_at.asc()  # Fallback for older data without field_order
            ).offset(skip).limit(limit)
            
            result = await self.db.execute(query)
            fields = result.scalars().all()
            
            # Format response
            fields_list = []
            for field in fields:
                fields_list.append({
                    "id": str(field.id),
                    "document_id": str(field.document_id),
                    "job_id": str(field.job_id),
                    "field_name": field.field_name,
                    "field_label": field.field_label,
                    "field_type": field.field_type,
                    "field_value": field.field_value,
                    "field_group": field.field_group,
                    "confidence_score": field.confidence_score,
                    "page_number": field.page_number,
                    "extraction_method": field.extraction_method,
                    "validation_status": field.validation_status,
                    "needs_manual_review": field.needs_manual_review,
                    "review_notes": field.review_notes,
                    "bounding_box": field.bounding_box,
                    "created_at": field.created_at.isoformat() if field.created_at else None,
                    "updated_at": field.updated_at.isoformat() if field.updated_at else None
                })
            
            logger.info(f"📊 Retrieved {len(fields_list)} fields for document {document_id}")
            
            return {
                "success": True,
                "document_id": document_id,
                "total_fields": total,
                "returned_fields": len(fields_list),
                "skip": skip,
                "limit": limit,
                "filters": {
                    "page_number": page_number,
                    "group_name": group_name
                },
                "fields": fields_list
            }
        
        except ValueError as e:
            logger.error(f"❌ Invalid document ID format: {document_id}")
            return {
                "success": False,
                "error": f"Invalid document ID format: {document_id}",
                "fields": []
            }
        except Exception as e:
            logger.error(f"❌ Error getting fields for document {document_id}: {e}")
            raise
    
    async def get_field_by_id(self, field_id: str) -> Optional[Dict[str, Any]]:
        """Get a single field by ID"""
        try:
            field_uuid = uuid.UUID(field_id)
            
            result = await self.db.execute(
                select(BulkExtractedField).where(BulkExtractedField.id == field_uuid)
            )
            field = result.scalar_one_or_none()
            
            if not field:
                return None
            
            return {
                "id": str(field.id),
                "document_id": str(field.document_id),
                "job_id": str(field.job_id),
                "field_name": field.field_name,
                "field_label": field.field_label,
                "field_type": field.field_type,
                "field_value": field.field_value,
                "field_group": field.field_group,
                "confidence_score": field.confidence_score,
                "page_number": field.page_number,
                "extraction_method": field.extraction_method,
                "validation_status": field.validation_status,
                "needs_manual_review": field.needs_manual_review,
                "review_notes": field.review_notes,
                "bounding_box": field.bounding_box,
                "created_at": field.created_at.isoformat() if field.created_at else None,
                "updated_at": field.updated_at.isoformat() if field.updated_at else None
            }
        
        except ValueError:
            return None
        except Exception as e:
            logger.error(f"❌ Error getting field {field_id}: {e}")
            raise
    
    async def update_field(
        self,
        field_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a field (for manual corrections)
        
        Args:
            field_id: Field UUID
            updates: Dict with fields to update
                - field_value: New value
                - validation_status: 'pending', 'reviewed', 'corrected'
                - needs_manual_review: bool
                - review_notes: str
        
        Returns:
            Updated field dict or None if not found
        """
        try:
            field_uuid = uuid.UUID(field_id)
            
            # Get existing field
            result = await self.db.execute(
                select(BulkExtractedField).where(BulkExtractedField.id == field_uuid)
            )
            field = result.scalar_one_or_none()
            
            if not field:
                return None
            
            # Apply updates
            if "field_value" in updates:
                field.field_value = updates["field_value"]
            
            if "validation_status" in updates:
                field.validation_status = updates["validation_status"]
            
            if "needs_manual_review" in updates:
                field.needs_manual_review = updates["needs_manual_review"]
            
            if "review_notes" in updates:
                field.review_notes = updates["review_notes"]
            
            # Set reviewed timestamp if marking as reviewed/corrected
            if updates.get("validation_status") in ["reviewed", "corrected"]:
                field.reviewed_at = datetime.utcnow()
                # TODO: Set reviewed_by from authenticated user
            
            field.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(field)
            
            logger.info(f"✅ Updated field {field_id}")
            
            return {
                "id": str(field.id),
                "document_id": str(field.document_id),
                "job_id": str(field.job_id),
                "field_name": field.field_name,
                "field_label": field.field_label,
                "field_type": field.field_type,
                "field_value": field.field_value,
                "field_group": field.field_group,
                "confidence_score": field.confidence_score,
                "page_number": field.page_number,
                "extraction_method": field.extraction_method,
                "validation_status": field.validation_status,
                "needs_manual_review": field.needs_manual_review,
                "review_notes": field.review_notes,
                "bounding_box": field.bounding_box,
                "created_at": field.created_at.isoformat() if field.created_at else None,
                "updated_at": field.updated_at.isoformat() if field.updated_at else None
            }
        
        except ValueError:
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error updating field {field_id}: {e}")
            raise
    
    async def get_fields_grouped_by_page(self, document_id: str) -> Dict[str, Any]:
        """
        Get fields grouped by page number
        
        Returns:
            Dict with pages as keys, each containing array of fields
        """
        try:
            doc_uuid = uuid.UUID(document_id)
            
            # Get all fields ordered by page, then by field_order to preserve document order
            query = select(BulkExtractedField).where(
                BulkExtractedField.document_id == doc_uuid
            ).order_by(
                BulkExtractedField.page_number.asc(),
                BulkExtractedField.field_order.asc().nullslast(),
                BulkExtractedField.created_at.asc()  # Fallback for older data without field_order
            )
            
            result = await self.db.execute(query)
            fields = result.scalars().all()
            
            # Group by page
            pages: Dict[int, List[Dict[str, Any]]] = {}
            
            for field in fields:
                page_num = field.page_number or 0
                
                if page_num not in pages:
                    pages[page_num] = []
                
                pages[page_num].append({
                    "id": str(field.id),
                    "field_name": field.field_name,
                    "field_label": field.field_label,
                    "field_type": field.field_type,
                    "field_value": field.field_value,
                    "field_group": field.field_group,
                    "confidence_score": field.confidence_score,
                    "needs_manual_review": field.needs_manual_review,
                    "validation_status": field.validation_status
                })
            
            # Calculate stats
            total_fields = len(fields)
            total_pages = len(pages)
            avg_confidence = (
                sum(f.confidence_score or 0 for f in fields) / total_fields
                if total_fields > 0 else 0
            )
            needs_review_count = sum(1 for f in fields if f.needs_manual_review)
            
            return {
                "success": True,
                "document_id": document_id,
                "total_pages": total_pages,
                "total_fields": total_fields,
                "avg_confidence": round(avg_confidence, 3),
                "needs_review_count": needs_review_count,
                "pages": pages
            }
        
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid document ID: {document_id}",
                "pages": {}
            }
        except Exception as e:
            logger.error(f"❌ Error getting grouped fields for document {document_id}: {e}")
            raise
    
    async def get_document_statistics(self, document_id: str) -> Dict[str, Any]:
        """Get extraction statistics for a document"""
        try:
            doc_uuid = uuid.UUID(document_id)
            
            # Count total fields
            total_query = select(func.count()).select_from(BulkExtractedField).where(
                BulkExtractedField.document_id == doc_uuid
            )
            total_result = await self.db.execute(total_query)
            total_fields = total_result.scalar() or 0
            
            # Count by validation status
            status_query = select(
                BulkExtractedField.validation_status,
                func.count()
            ).where(
                BulkExtractedField.document_id == doc_uuid
            ).group_by(BulkExtractedField.validation_status)
            
            status_result = await self.db.execute(status_query)
            status_counts = {row[0]: row[1] for row in status_result.all()}
            
            # Count needs review
            review_query = select(func.count()).select_from(BulkExtractedField).where(
                BulkExtractedField.document_id == doc_uuid,
                BulkExtractedField.needs_manual_review == True
            )
            review_result = await self.db.execute(review_query)
            needs_review = review_result.scalar() or 0
            
            # Average confidence
            conf_query = select(func.avg(BulkExtractedField.confidence_score)).where(
                BulkExtractedField.document_id == doc_uuid
            )
            conf_result = await self.db.execute(conf_query)
            avg_confidence = conf_result.scalar() or 0
            
            # Count unique pages
            page_query = select(func.count(func.distinct(BulkExtractedField.page_number))).where(
                BulkExtractedField.document_id == doc_uuid
            )
            page_result = await self.db.execute(page_query)
            unique_pages = page_result.scalar() or 0
            
            # Count unique groups
            group_query = select(func.count(func.distinct(BulkExtractedField.field_group))).where(
                BulkExtractedField.document_id == doc_uuid
            )
            group_result = await self.db.execute(group_query)
            unique_groups = group_result.scalar() or 0
            
            return {
                "success": True,
                "document_id": document_id,
                "total_fields": total_fields,
                "unique_pages": unique_pages,
                "unique_groups": unique_groups,
                "avg_confidence": round(float(avg_confidence), 3),
                "needs_review": needs_review,
                "validation_status_counts": status_counts
            }
        
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid document ID: {document_id}"
            }
        except Exception as e:
            logger.error(f"❌ Error getting statistics for document {document_id}: {e}")
            raise
