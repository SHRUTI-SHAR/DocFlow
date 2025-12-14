"""
Manual Review Queue API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.schemas import ReviewQueueItemResponse, ReviewQueueListResponse
from app.services.review_queue_service import ReviewQueueService

router = APIRouter()


@router.get("/review-queue", response_model=ReviewQueueListResponse)
async def list_review_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all items in the manual review queue"""
    try:
        service = ReviewQueueService(db)
        items = await service.list_items(
            skip=skip,
            limit=limit,
            status_filter=status_filter
        )
        return items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/review-queue/{item_id}", response_model=ReviewQueueItemResponse)
async def get_review_item(
    item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific review queue item"""
    try:
        service = ReviewQueueService(db)
        item = await service.get_item(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review item {item_id} not found"
            )
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/review-queue/{item_id}/retry")
async def retry_from_review(
    item_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retry processing a document from review queue"""
    try:
        service = ReviewQueueService(db)
        result = await service.retry_item(item_id)
        if result is False:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review item {item_id} not found"
            )
        return {"success": True, "message": "Document retry initiated and removed from queue"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/review-queue/{item_id}/resolve")
async def resolve_review_item(
    item_id: str,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Mark a review queue item as resolved"""
    try:
        service = ReviewQueueService(db)
        result = await service.resolve_item(item_id, notes)
        if result is False:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Review item {item_id} not found"
            )
        return {"success": True, "message": "Review item removed from queue"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

