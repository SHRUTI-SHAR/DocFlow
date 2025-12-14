"""
Discovery Worker Tasks
Discovers documents from various sources
"""

from app.workers.celery_app import celery_app
from typing import Dict, Any, List
import logging
import os
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from app.core.database import get_sync_db
from app.models.database import BulkJob, BulkJobDocument
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='app.workers.discovery.discover_documents')
def discover_documents(self, job_id: str, source_config: Dict[str, Any]):
    """
    Discover documents from a source
    
    Args:
        job_id: Bulk job ID
        source_config: Source configuration (type, path, etc.)
    
    Returns:
        List of discovered document IDs
    """
    logger.info(f"🔍 Starting document discovery for job {job_id}")
    logger.info(f"📋 Source config: {source_config}")
    
    try:
        # Determine source type
        provider = source_config.get('provider')  # google_drive, onedrive, etc.
        file_id = source_config.get('file_id')
        
        logger.info(f"🔑 Provider: {provider}, File ID: {file_id}")
        
        # If single file specified, handle it directly
        if file_id:
            logger.info(f"📄 Processing single file: {source_config.get('file_name', 'unknown')}")
            
            db = next(get_sync_db())
            try:
                # Get job
                job = db.query(BulkJob).filter(BulkJob.id == job_id).first()
                if not job:
                    logger.error(f"❌ Job not found: {job_id}")
                    return []
                
                # Create single document record
                doc = BulkJobDocument(
                    id=uuid4(),
                    job_id=job_id,
                    source_path=source_config['file_id'],  # Store file ID as source path
                    filename=source_config.get('file_name', 'document.pdf'),
                    file_size=None,  # Will be updated during download
                    status='pending'
                )
                db.add(doc)
                
                # Update job total_documents
                job.total_documents = 1
                db.commit()
                
                document_id = str(doc.id)
                logger.info(f"✅ Single file queued: {doc.filename}")
                
                # Don't queue processing here - start_job will handle it
                # This prevents double-queueing when start_job checks for existing documents
                
                return [document_id]
                
            finally:
                db.close()
        
        # Handle folder-based discovery (Google Drive folder, local folder, etc.)
        if provider in ['google_drive', 'onedrive']:
            # Use appropriate source adapter
            from app.services.source_adapter import SourceAdapterFactory
            
            adapter = SourceAdapterFactory.create(provider)
            discovered_docs = adapter.discover_documents(source_config, batch_size=100)
            
            logger.info(f"📄 Found {len(discovered_docs)} documents from {provider}")
            
        else:
            # Folder source (local or Supabase Storage)
            # Use FolderSourceAdapter for both local and Supabase Storage
            from app.services.source_adapter import SourceAdapterFactory
            
            adapter = SourceAdapterFactory.create('folder')
            discovered_docs = adapter.discover_documents(source_config, batch_size=100)
            
            folder_path = source_config.get('path', '')
            logger.info(f"📁 Scanned folder: {folder_path}")
            logger.info(f"📄 Found {len(discovered_docs)} documents")
        
        # Create database records for all discovered documents
        db = next(get_sync_db())
        try:
            # Get job
            job = db.query(BulkJob).filter(BulkJob.id == job_id).first()
            if not job:
                logger.error(f"❌ Job not found: {job_id}")
                return []
            
            # Create document records
            document_ids = []
            for doc_info in discovered_docs:
                doc = BulkJobDocument(
                    id=uuid4(),
                    job_id=job_id,
                    source_path=doc_info.source_path,
                    filename=doc_info.filename,
                    file_size=doc_info.file_size,
                    status='pending'
                )
                db.add(doc)
                document_ids.append(str(doc.id))
                logger.info(f"  ✅ {doc_info.filename}")
            
            # Update job total_documents
            job.total_documents = len(document_ids)
            db.commit()
            
            logger.info(f"✅ Discovery complete for job {job_id}: {len(document_ids)} documents")
            
            # Queue processing tasks for discovered documents
            from app.workers.processing import process_document
            
            job_config = {
                'source_config': source_config,
                'processing_options': job.processing_options if job.processing_options else {},
                'extraction_task': 'without_template_extraction'
            }
            
            queued_count = 0
            for doc_id in document_ids:
                try:
                    process_document.delay(doc_id, job_id, job_config)
                    queued_count += 1
                except Exception as e:
                    logger.error(f"   ❌ Failed to queue document {doc_id}: {e}")
            
            logger.info(f"📤 Queued {queued_count}/{len(document_ids)} documents for processing")
            
            return document_ids
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"❌ Discovery failed for job {job_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(name='app.workers.discovery.periodic_discovery')
def periodic_discovery(job_id: str):
    """
    Periodic discovery for continuous processing mode
    
    Args:
        job_id: Bulk job ID
    """
    logger.info(f"🔄 Running periodic discovery for job {job_id}")
    
    try:
        # TODO: Implement periodic discovery
        # 1. Check if job is in continuous mode
        # 2. Discover new documents
        # 3. Queue new documents for processing
        pass
    except Exception as e:
        logger.error(f"❌ Periodic discovery failed for job {job_id}: {e}")

