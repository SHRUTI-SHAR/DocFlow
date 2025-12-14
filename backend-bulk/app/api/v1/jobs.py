"""
Job Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import optional_auth
from app.models.schemas import (
    BulkJobCreate,
    BulkJobUpdate,
    BulkJobResponse,
    BulkJobListResponse
)
from app.services.job_service import JobService
from app.services.source_adapter import FolderSourceAdapter

router = APIRouter()


class EstimateRequest(BaseModel):
    source_type: str
    source_config: Dict[str, Any]


class EstimateResponse(BaseModel):
    estimated_documents: int
    message: str


@router.post("/bulk-jobs", response_model=BulkJobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: BulkJobCreate,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(optional_auth)
):
    """Create a new bulk processing job"""
    try:
        service = JobService(db)
        job = await service.create_job(job_data)
        return job
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/bulk-jobs", response_model=BulkJobListResponse)
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Depends(optional_auth)
):
    """List bulk processing jobs for current user"""
    try:
        service = JobService(db)
        jobs = await service.list_jobs(skip=skip, limit=limit, status_filter=status_filter, user_id=user_id)
        return jobs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/bulk-jobs/{job_id}", response_model=BulkJobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific bulk processing job"""
    try:
        service = JobService(db)
        job = await service.get_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/bulk-jobs/{job_id}", response_model=BulkJobResponse)
async def update_job(
    job_id: str,
    job_data: BulkJobUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a bulk processing job"""
    try:
        service = JobService(db)
        job = await service.update_job(job_id, job_data)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/bulk-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a bulk processing job"""
    try:
        service = JobService(db)
        success = await service.delete_job(job_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/start", response_model=BulkJobResponse)
async def start_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Start a bulk processing job"""
    try:
        service = JobService(db)
        job = await service.start_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/pause", response_model=BulkJobResponse)
async def pause_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Pause a bulk processing job"""
    try:
        service = JobService(db)
        job = await service.pause_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/resume", response_model=BulkJobResponse)
async def resume_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Resume a paused bulk processing job"""
    try:
        service = JobService(db)
        job = await service.resume_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-jobs/{job_id}/stop", response_model=BulkJobResponse)
async def stop_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Stop a bulk processing job"""
    try:
        service = JobService(db)
        job = await service.stop_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/estimate", response_model=EstimateResponse)
async def estimate_documents(
    estimate_request: EstimateRequest
):
    """Estimate number of documents for a given source configuration"""
    try:
        if estimate_request.source_type == "folder":
            adapter = FolderSourceAdapter()
            config = estimate_request.source_config
            
            # Validate folder exists
            import os
            folder_path = config.get("path")
            if not folder_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Folder path is required"
                )
            
            if not os.path.exists(folder_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Folder path does not exist: {folder_path}"
                )
            
            # Count documents (with a reasonable limit for performance)
            # Use count_documents for better performance on large folders
            # Limit to 5000 for performance, but indicate if there might be more
            max_count = 5000
            estimated_count = adapter.count_documents(config, max_count=max_count)
            
            # If we hit the max limit, indicate it's an estimate
            if estimated_count >= max_count:
                message = f"Found at least {estimated_count} documents (may be more)"
            else:
                message = f"Found {estimated_count} documents"
            
            return EstimateResponse(
                estimated_documents=estimated_count,
                message=message
            )
        else:
            # For other source types, return a default estimate
            return EstimateResponse(
                estimated_documents=0,
                message="Estimation not available for this source type"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error estimating documents: {str(e)}"
        )


@router.post("/bulk-jobs/fix-stuck-jobs")
async def fix_stuck_jobs(
    db: AsyncSession = Depends(get_db)
):
    """Fix jobs that are stuck in 'running' status but all documents are processed"""
    try:
        from sqlalchemy import select, func
        from app.models.database import BulkJob, BulkJobDocument
        from datetime import datetime
        
        # Find all jobs in 'running' status
        result = await db.execute(
            select(BulkJob).where(BulkJob.status == 'running')
        )
        running_jobs = result.scalars().all()
        
        fixed_jobs = []
        
        for job in running_jobs:
            # Count total documents
            total_docs_result = await db.execute(
                select(func.count(BulkJobDocument.id)).where(
                    BulkJobDocument.job_id == job.id
                )
            )
            total_docs = total_docs_result.scalar()
            
            # Count completed documents (completed, failed, or needs_review)
            completed_docs_result = await db.execute(
                select(func.count(BulkJobDocument.id)).where(
                    BulkJobDocument.job_id == job.id,
                    BulkJobDocument.status.in_(['completed', 'failed', 'needs_review'])
                )
            )
            completed_docs = completed_docs_result.scalar()
            
            # If all documents are done, update job status
            if total_docs > 0 and completed_docs == total_docs:
                job.status = 'completed'
                job.completed_at = datetime.utcnow()
                fixed_jobs.append({
                    'job_id': str(job.id),
                    'job_name': job.name,
                    'documents': f"{completed_docs}/{total_docs}"
                })
        
        await db.commit()
        
        return {
            'success': True,
            'fixed_count': len(fixed_jobs),
            'fixed_jobs': fixed_jobs,
            'message': f"Fixed {len(fixed_jobs)} stuck jobs"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fixing stuck jobs: {str(e)}"
        )


@router.post("/bulk-jobs/add-needs-review-to-queue")
async def add_needs_review_to_queue(
    db: AsyncSession = Depends(get_db)
):
    """Add all 'needs_review' documents to review queue if not already there"""
    try:
        from sqlalchemy import select
        from app.models.database import BulkJobDocument, BulkManualReviewQueue
        
        # Find all documents with needs_review status
        result = await db.execute(
            select(BulkJobDocument).where(BulkJobDocument.status == 'needs_review')
        )
        needs_review_docs = result.scalars().all()
        
        added_count = 0
        skipped_count = 0
        
        for doc in needs_review_docs:
            # Check if already in review queue
            existing_result = await db.execute(
                select(BulkManualReviewQueue).where(
                    BulkManualReviewQueue.document_id == doc.id
                )
            )
            existing = existing_result.scalar_one_or_none()
            
            if not existing:
                # Add to review queue
                review_item = BulkManualReviewQueue(
                    document_id=doc.id,
                    job_id=doc.job_id,
                    reason="Document requires manual review",
                    error_message=doc.error_message,
                    error_type=doc.error_type or "Needs Review",
                    priority=2,
                    status="pending"
                )
                db.add(review_item)
                added_count += 1
            else:
                skipped_count += 1
        
        await db.commit()
        
        return {
            'success': True,
            'added_count': added_count,
            'skipped_count': skipped_count,
            'total_needs_review': len(needs_review_docs),
            'message': f"Added {added_count} documents to review queue, {skipped_count} already existed"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding documents to review queue: {str(e)}"
        )


