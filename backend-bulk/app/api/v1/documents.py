"""
Document Management API Endpoints
Includes document CRUD and extracted fields API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.models.schemas import BulkJobDocumentResponse, BulkJobDocumentListResponse
from app.services.document_service import DocumentService
from app.services.fields_service import FieldsService
from app.models.database import BulkDocumentTranscript
from sqlalchemy import select

router = APIRouter()


# ============================================================================
# Pydantic models for field operations
# ============================================================================

class FieldUpdateRequest(BaseModel):
    """Request model for updating a field"""
    field_value: Optional[str] = None
    validation_status: Optional[str] = None  # 'pending', 'reviewed', 'corrected'
    needs_manual_review: Optional[bool] = None
    review_notes: Optional[str] = None


class FieldResponse(BaseModel):
    """Response model for a single field"""
    id: str
    document_id: str
    job_id: str
    field_name: str
    field_label: Optional[str]
    field_type: str
    field_value: Optional[str]
    field_group: Optional[str]
    confidence_score: Optional[float]
    page_number: Optional[int]
    extraction_method: Optional[str]
    validation_status: Optional[str]
    needs_manual_review: bool
    review_notes: Optional[str]
    bounding_box: Optional[Dict[str, Any]]
    created_at: Optional[str]
    updated_at: Optional[str]


class FieldsListResponse(BaseModel):
    """Response model for list of fields"""
    success: bool
    document_id: str
    total_fields: int
    returned_fields: int
    skip: int
    limit: int
    filters: Dict[str, Any]
    fields: List[Dict[str, Any]]


class FieldsGroupedResponse(BaseModel):
    """Response model for fields grouped by page"""
    success: bool
    document_id: str
    total_pages: int
    total_fields: int
    avg_confidence: float
    needs_review_count: int
    pages: Dict[int, List[Dict[str, Any]]]


class DocumentStatsResponse(BaseModel):
    """Response model for document statistics"""
    success: bool
    document_id: str
    total_fields: int
    unique_pages: int
    unique_groups: int
    avg_confidence: float
    needs_review: int
    validation_status_counts: Dict[str, int]


@router.get("/bulk-jobs/{job_id}/documents", response_model=BulkJobDocumentListResponse)
async def list_documents(
    job_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all documents for a specific job"""
    try:
        service = DocumentService(db)
        documents = await service.list_documents(
            job_id=job_id,
            skip=skip,
            limit=limit,
            status_filter=status_filter
        )
        return documents
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}/documents/{document_id}", response_model=BulkJobDocumentResponse)
async def get_document(
    job_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific document"""
    try:
        service = DocumentService(db)
        document = await service.get_document(job_id, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/documents/{document_id}/retry", response_model=BulkJobDocumentResponse)
async def retry_document(
    job_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Manually retry processing a failed document"""
    try:
        service = DocumentService(db)
        document = await service.retry_document(job_id, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )
        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# EXTRACTED FIELDS API ENDPOINTS
# ============================================================================

@router.get("/bulk-jobs/{job_id}/documents/{document_id}/fields")
async def get_document_fields(
    job_id: str,
    document_id: str,
    page: Optional[int] = Query(None, description="Filter by page number"),
    group: Optional[str] = Query(None, description="Filter by field group"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all extracted fields for a document
    
    Query Parameters:
    - page: Filter by page number (optional)
    - group: Filter by field group/section (optional)
    - skip: Pagination offset (default: 0)
    - limit: Max results (default: 1000, max: 5000)
    
    Returns:
    - List of extracted fields with metadata
    - Filters applied
    - Total count
    """
    try:
        fields_service = FieldsService(db)
        result = await fields_service.get_document_fields(
            document_id=document_id,
            page_number=page,
            group_name=group,
            skip=skip,
            limit=limit
        )
        
        if not result.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get fields")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}/documents/{document_id}/fields/grouped")
async def get_document_fields_grouped(
    job_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all extracted fields grouped by page number
    
    Returns:
    - Fields organized by page
    - Statistics (total fields, avg confidence, needs review count)
    """
    try:
        fields_service = FieldsService(db)
        result = await fields_service.get_fields_grouped_by_page(document_id)
        
        if not result.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get grouped fields")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}/documents/{document_id}/fields/stats")
async def get_document_fields_stats(
    job_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get extraction statistics for a document
    
    Returns:
    - Total fields count
    - Unique pages count
    - Unique groups count
    - Average confidence score
    - Needs review count
    - Validation status breakdown
    """
    try:
        fields_service = FieldsService(db)
        result = await fields_service.get_document_statistics(document_id)
        
        if not result.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get statistics")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}/documents/{document_id}/fields/{field_id}")
async def get_field(
    job_id: str,
    document_id: str,
    field_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific extracted field by ID"""
    try:
        fields_service = FieldsService(db)
        field = await fields_service.get_field_by_id(field_id)
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field {field_id} not found"
            )
        
        return {"success": True, "field": field}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/bulk-jobs/{job_id}/documents/{document_id}/fields/{field_id}")
async def update_field(
    job_id: str,
    document_id: str,
    field_id: str,
    update_data: FieldUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an extracted field (for manual corrections)
    
    Request Body:
    - field_value: New value for the field (optional)
    - validation_status: 'pending', 'reviewed', 'corrected' (optional)
    - needs_manual_review: bool (optional)
    - review_notes: Notes about the correction (optional)
    
    Returns:
    - Updated field
    """
    try:
        fields_service = FieldsService(db)
        
        # Build updates dict from non-None values
        updates = {}
        if update_data.field_value is not None:
            updates["field_value"] = update_data.field_value
        if update_data.validation_status is not None:
            updates["validation_status"] = update_data.validation_status
        if update_data.needs_manual_review is not None:
            updates["needs_manual_review"] = update_data.needs_manual_review
        if update_data.review_notes is not None:
            updates["review_notes"] = update_data.review_notes
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update fields provided"
            )
        
        field = await fields_service.update_field(field_id, updates)
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field {field_id} not found"
            )
        
        return {"success": True, "field": field, "message": "Field updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/documents/{document_id}/fields/{field_id}/mark-reviewed")
async def mark_field_reviewed(
    job_id: str,
    document_id: str,
    field_id: str,
    notes: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a field as reviewed (shortcut endpoint)
    Sets validation_status to 'reviewed' and needs_manual_review to False
    """
    try:
        fields_service = FieldsService(db)
        
        updates = {
            "validation_status": "reviewed",
            "needs_manual_review": False
        }
        if notes:
            updates["review_notes"] = notes
        
        field = await fields_service.update_field(field_id, updates)
        
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field {field_id} not found"
            )
        
        return {"success": True, "field": field, "message": "Field marked as reviewed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# DOCUMENT EXPORT ENDPOINT
# ============================================================================

@router.get("/bulk-jobs/{job_id}/documents/{document_id}/export")
async def export_document_data(
    job_id: str,
    document_id: str,
    format: str = Query("json", description="Export format: json, csv"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all extracted data for a single document
    
    Query Parameters:
    - format: 'json' (default) or 'csv'
    
    Returns:
    - JSON: Hierarchical structure with all fields
    - CSV: Flat format with all fields
    """
    from fastapi.responses import StreamingResponse
    import csv
    from io import StringIO
    
    try:
        fields_service = FieldsService(db)
        result = await fields_service.get_document_fields(
            document_id=document_id,
            limit=10000  # Get all fields
        )
        
        if not result.get("success", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to get fields")
            )
        
        fields = result.get("fields", [])
        
        if format == "csv":
            # Generate CSV
            output = StringIO()
            if fields:
                writer = csv.DictWriter(output, fieldnames=[
                    "field_name", "field_label", "field_type", "field_value",
                    "field_group", "confidence_score", "page_number",
                    "validation_status", "needs_manual_review"
                ])
                writer.writeheader()
                for field in fields:
                    writer.writerow({
                        "field_name": field.get("field_name"),
                        "field_label": field.get("field_label"),
                        "field_type": field.get("field_type"),
                        "field_value": field.get("field_value"),
                        "field_group": field.get("field_group"),
                        "confidence_score": field.get("confidence_score"),
                        "page_number": field.get("page_number"),
                        "validation_status": field.get("validation_status"),
                        "needs_manual_review": field.get("needs_manual_review")
                    })
            
            csv_content = output.getvalue()
            return StreamingResponse(
                iter([csv_content]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=document_{document_id}_fields.csv"
                }
            )
        
        else:  # JSON format (default)
            # Organize by page and group
            organized = {}
            for field in fields:
                page = field.get("page_number", 0)
                group = field.get("field_group", "ungrouped")
                
                if page not in organized:
                    organized[page] = {}
                if group not in organized[page]:
                    organized[page][group] = {}
                
                organized[page][group][field.get("field_name")] = {
                    "value": field.get("field_value"),
                    "type": field.get("field_type"),
                    "confidence": field.get("confidence_score"),
                    "needs_review": field.get("needs_manual_review")
                }
            
            return {
                "success": True,
                "document_id": document_id,
                "total_fields": len(fields),
                "data": organized,
                "raw_fields": fields
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}/documents/{document_id}/transcript")
async def get_document_transcript(
    job_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the transcript of extracted document data.
    
    The transcript includes:
    - Full document text with page numbers
    - Section names and hierarchy
    - Field names and values in human-readable format
    - Field locations (page, section, context)
    
    This is what the LLM sees during template mapping.
    """
    try:
        # Query transcript from database
        query = select(BulkDocumentTranscript).where(
            BulkDocumentTranscript.document_id == document_id
        )
        result = await db.execute(query)
        transcript_record = result.scalar_one_or_none()
        
        if not transcript_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transcript not found. The document may not have been processed yet."
            )
        
        return {
            "success": True,
            "document_id": document_id,
            "job_id": str(transcript_record.job_id),
            "full_transcript": transcript_record.full_transcript,
            "page_transcripts": transcript_record.page_transcripts,
            "section_index": transcript_record.section_index,
            "field_locations": transcript_record.field_locations,
            "total_pages": transcript_record.total_pages,
            "total_sections": transcript_record.total_sections,
            "generation_time_ms": transcript_record.generation_time_ms,
            "created_at": transcript_record.created_at.isoformat() if transcript_record.created_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )