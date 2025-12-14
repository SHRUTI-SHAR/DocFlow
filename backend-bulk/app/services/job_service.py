"""
Job Service - Business logic for bulk processing jobs
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.models.schemas import (
    BulkJobCreate, BulkJobUpdate, BulkJobResponse, BulkJobListResponse, BulkJobStatus
)
from app.models.database import BulkJob, BulkJobDocument
from app.workers.discovery import discover_documents

logger = logging.getLogger(__name__)


class JobService:
    """Service for managing bulk processing jobs"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_job(self, job_data: BulkJobCreate) -> BulkJobResponse:
        """Create a new bulk processing job"""
        try:
            # Create database record
            user_uuid = None
            if job_data.user_id:
                try:
                    user_uuid = uuid.UUID(job_data.user_id)
                except ValueError:
                    pass
            
            # Map cloud provider types to 'cloud' for database
            source_type_value = job_data.source_type.value
            if source_type_value in ['google_drive', 'onedrive']:
                db_source_type = 'cloud'
                # Store original provider type in config for later use
                source_config = {**job_data.source_config, 'provider': source_type_value}
            else:
                db_source_type = source_type_value
                source_config = job_data.source_config
            
            db_job = BulkJob(
                id=uuid.uuid4(),
                name=job_data.name,
                user_id=user_uuid,
                source_type=db_source_type,
                source_config=source_config,
                processing_config={
                    "mode": job_data.processing_config.mode.value,
                    "discovery_batch_size": job_data.processing_config.discovery_batch_size
                },
                processing_options=job_data.processing_options.model_dump(),
                status="pending",
                total_documents=0,
                processed_documents=0,
                failed_documents=0
            )
            self.db.add(db_job)
            await self.db.commit()
            await self.db.refresh(db_job)
            
            logger.info(f"✅ Created bulk job: {db_job.id} - {db_job.name}")
            return BulkJobResponse.from_orm(db_job)
        
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error creating job: {e}")
            raise
    
    async def get_job(self, job_id: str) -> Optional[BulkJobResponse]:
        """Get a job by ID with needs_review count in a single query"""
        try:
            # Use subquery to get needs_review count in single round trip
            # Avoids prepared statement issues with pgbouncer
            needs_review_subquery = (
                select(
                    BulkJobDocument.job_id,
                    func.count(BulkJobDocument.id).label('needs_review_count')
                )
                .where(BulkJobDocument.status == 'needs_review')
                .group_by(BulkJobDocument.job_id)
                .subquery()
            )
            
            query = (
                select(
                    BulkJob,
                    func.coalesce(needs_review_subquery.c.needs_review_count, 0).label('needs_review_count')
                )
                .outerjoin(needs_review_subquery, BulkJob.id == needs_review_subquery.c.job_id)
                .where(BulkJob.id == uuid.UUID(job_id))
            )
            
            result = await self.db.execute(query)
            row = result.one_or_none()
            
            if row:
                job = row[0]
                needs_review_count = row[1]
                job_response = BulkJobResponse.from_orm(job)
                job_response.documents_needing_review = needs_review_count
                return job_response
            return None
        
        except ValueError:
            # Invalid UUID format
            return None
        except Exception as e:
            logger.error(f"❌ Error getting job {job_id}: {e}")
            raise
    
    async def list_jobs(
        self,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> BulkJobListResponse:
        """List jobs, optionally filtered by user
        
        Optimized to use a single query with LEFT JOIN to avoid N+1 query problem
        which causes significant latency with Supabase pooler connections.
        """
        try:
            from sqlalchemy import literal_column, case, outerjoin
            from sqlalchemy.orm import aliased
            
            # Build base conditions
            conditions = []
            if user_id:
                try:
                    user_uuid = uuid.UUID(user_id)
                    conditions.append(BulkJob.user_id == user_uuid)
                except ValueError:
                    logger.warning(f"Invalid user_id format: {user_id}")
                    return BulkJobListResponse(jobs=[], total=0, skip=skip, limit=limit)
            
            if status_filter:
                conditions.append(BulkJob.status == status_filter)
            
            # Get total count in a single query
            count_query = select(func.count(BulkJob.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            total_result = await self.db.execute(count_query)
            total = total_result.scalar() or 0
            
            if total == 0:
                return BulkJobListResponse(jobs=[], total=0, skip=skip, limit=limit)
            
            # Single optimized query: Get jobs with needs_review count using subquery
            # This avoids N+1 queries which are slow with Supabase pooler
            needs_review_subquery = (
                select(
                    BulkJobDocument.job_id,
                    func.count(BulkJobDocument.id).label('needs_review_count')
                )
                .where(BulkJobDocument.status == 'needs_review')
                .group_by(BulkJobDocument.job_id)
                .subquery()
            )
            
            # Main query with LEFT JOIN to get needs_review counts in one round trip
            query = (
                select(
                    BulkJob,
                    func.coalesce(needs_review_subquery.c.needs_review_count, 0).label('needs_review_count')
                )
                .outerjoin(needs_review_subquery, BulkJob.id == needs_review_subquery.c.job_id)
            )
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(BulkJob.created_at.desc()).offset(skip).limit(limit)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            # Build response with pre-fetched needs_review counts
            job_responses = []
            for row in rows:
                job = row[0]  # BulkJob object
                needs_review_count = row[1]  # needs_review_count
                job_response = BulkJobResponse.from_orm(job)
                job_response.documents_needing_review = needs_review_count
                job_responses.append(job_response)
            
            return BulkJobListResponse(
                jobs=job_responses,
                total=total,
                skip=skip,
                limit=limit
            )
        
        except Exception as e:
            logger.error(f"❌ Error listing jobs: {e}")
            raise
    
    async def update_job(
        self,
        job_id: str,
        job_data: BulkJobUpdate
    ) -> Optional[BulkJobResponse]:
        """Update a job"""
        try:
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return None
            
            # Update fields
            if job_data.name is not None:
                job.name = job_data.name
            
            if job_data.processing_options is not None:
                # Merge processing options
                current_options = job.processing_options or {}
                new_options = job_data.processing_options.model_dump()
                current_options.update(new_options)
                job.processing_options = current_options
            
            job.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(job)
            
            logger.info(f"✅ Updated job: {job_id}")
            return BulkJobResponse.from_orm(job)
        
        except ValueError:
            return None
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error updating job {job_id}: {e}")
            raise
    
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job and all related data
        
        Uses raw SQL to properly cascade delete all related records
        since SQLAlchemy ORM cascade may not work correctly with pgbouncer.
        """
        try:
            job_uuid = uuid.UUID(job_id)
            
            # Check if job exists first
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == job_uuid)
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return False
            
            # Delete in correct order to respect foreign key constraints
            # Use raw SQL for reliable cascade with pgbouncer
            from sqlalchemy import text
            
            # 1. Delete transcripts (references documents)
            await self.db.execute(
                text("DELETE FROM bulk_document_transcripts WHERE job_id = :job_id"),
                {"job_id": job_uuid}
            )
            
            # 2. Delete extracted fields (references documents and jobs)
            await self.db.execute(
                text("DELETE FROM bulk_extracted_fields WHERE job_id = :job_id"),
                {"job_id": job_uuid}
            )
            
            # 3. Delete manual review queue items (references documents and jobs)
            await self.db.execute(
                text("DELETE FROM bulk_manual_review_queue WHERE job_id = :job_id"),
                {"job_id": job_uuid}
            )
            
            # 4. Delete processing logs (references documents and jobs)
            await self.db.execute(
                text("DELETE FROM bulk_processing_logs WHERE job_id = :job_id"),
                {"job_id": job_uuid}
            )
            
            # 5. Delete documents (references jobs)
            await self.db.execute(
                text("DELETE FROM bulk_job_documents WHERE job_id = :job_id"),
                {"job_id": job_uuid}
            )
            
            # 6. Finally delete the job itself
            await self.db.execute(
                text("DELETE FROM bulk_jobs WHERE id = :job_id"),
                {"job_id": job_uuid}
            )
            
            await self.db.commit()
            
            logger.info(f"✅ Deleted job and all related data: {job_id}")
            return True
        
        except ValueError:
            return False
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error deleting job {job_id}: {e}")
            raise
    
    async def start_job(self, job_id: str) -> Optional[BulkJobResponse]:
        """Start a bulk processing job"""
        try:
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return None
            
            # Validate job can be started
            if job.status not in ["pending", "paused"]:
                raise ValueError(f"Cannot start job in status: {job.status}")
            
            # Update job status
            job.status = "running"
            if not job.started_at:
                job.started_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(job)
            
            # Check if job already has documents (uploaded files case)
            from app.models.database import BulkJobDocument
            doc_count_result = await self.db.execute(
                select(func.count()).select_from(BulkJobDocument).where(
                    BulkJobDocument.job_id == uuid.UUID(job_id)
                )
            )
            existing_doc_count = doc_count_result.scalar() or 0
            
            if existing_doc_count > 0:
                # Documents already exist (from upload) - queue processing directly
                logger.info(f"📄 Job {job_id} has {existing_doc_count} documents - skipping discovery, starting processing")
                
                # Get all pending documents
                docs_result = await self.db.execute(
                    select(BulkJobDocument).where(
                        and_(
                            BulkJobDocument.job_id == uuid.UUID(job_id),
                            BulkJobDocument.status == 'pending'
                        )
                    )
                )
                documents = docs_result.scalars().all()
                
                # Queue processing tasks for each document
                from app.workers.processing import process_document
                for doc in documents:
                    job_config = {
                        'source_config': job.source_config,
                        'processing_options': job.processing_options,
                        'extraction_task': 'without_template_extraction'
                    }
                    process_document.delay(str(doc.id), str(job.id), job_config)
                    logger.info(f"   📄 Queued processing for document: {doc.filename}")
                
                logger.info(f"✅ Started job {job_id} with {len(documents)} documents")
            else:
                # No documents yet - need to discover from source
                try:
                    from app.services.source_adapter import SourceAdapterFactory
                    # For cloud sources, use the provider type from config
                    adapter_type = job.source_config.get('provider', job.source_type) if job.source_type == 'cloud' else job.source_type
                    adapter = SourceAdapterFactory.create(adapter_type)
                    
                    # Validate source
                    if not adapter.validate_source(job.source_config):
                        raise ValueError(f"Invalid source configuration for {adapter_type}")
                    
                    # Queue discovery task
                    discovery_result = discover_documents.delay(
                        str(job.id),
                        job.source_config
                    )
                    logger.info(f"🚀 Queued discovery task for job {job_id}: {discovery_result.id}")
                
                except Exception as e:
                    logger.error(f"❌ Error queueing discovery task: {e}")
                    # Rollback job status
                    job.status = BulkJobStatus.FAILED.value
                    await self.db.commit()
                    raise
            
            logger.info(f"✅ Started job: {job_id}")
            return BulkJobResponse.from_orm(job)
        
        except ValueError as e:
            logger.error(f"❌ Invalid job ID or status: {e}")
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error starting job {job_id}: {e}")
            raise
    
    async def pause_job(self, job_id: str) -> Optional[BulkJobResponse]:
        """Pause a running job"""
        try:
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return None
            
            if job.status != "running":
                raise ValueError(f"Cannot pause job in status: {job.status}")
            
            job.status = "paused"
            job.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(job)
            
            logger.info(f"⏸️ Paused job: {job_id}")
            return BulkJobResponse.from_orm(job)
        
        except ValueError as e:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error pausing job {job_id}: {e}")
            raise
    
    async def resume_job(self, job_id: str) -> Optional[BulkJobResponse]:
        """Resume a paused job"""
        try:
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return None
            
            if job.status != "paused":
                raise ValueError(f"Cannot resume job in status: {job.status}")
            
            job.status = "running"
            job.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(job)
            
            logger.info(f"▶️ Resumed job: {job_id}")
            return BulkJobResponse.from_orm(job)
        
        except ValueError as e:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error resuming job {job_id}: {e}")
            raise
    
    async def stop_job(self, job_id: str) -> Optional[BulkJobResponse]:
        """Stop a running or paused job"""
        try:
            result = await self.db.execute(
                select(BulkJob).where(BulkJob.id == uuid.UUID(job_id))
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return None
            
            if job.status not in [BulkJobStatus.RUNNING.value, BulkJobStatus.PAUSED.value]:
                raise ValueError(f"Cannot stop job in status: {job.status}")
            
            job.status = BulkJobStatus.STOPPED.value
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(job)
            
            # TODO: Cancel pending Celery tasks for this job
            
            logger.info(f"🛑 Stopped job: {job_id}")
            return BulkJobResponse.from_orm(job)
        
        except ValueError as e:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Error stopping job {job_id}: {e}")
            raise

