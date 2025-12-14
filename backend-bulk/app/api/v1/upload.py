"""
Upload API for Bulk Processing
Handles file uploads and job creation with files
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Body
from typing import List, Optional
from pydantic import BaseModel
import logging
import os
import uuid
from pathlib import Path
import shutil

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Supabase Storage client - initialized lazily
_supabase_client = None
_supabase_initialized = False

def get_supabase_client():
    """Get or initialize Supabase client"""
    global _supabase_client, _supabase_initialized
    
    if not _supabase_initialized:
        _supabase_initialized = True
        try:
            if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
                # Clear ALL proxy environment variables before importing supabase
                # The supabase/httpx client picks these up and causes 'proxy' argument error
                proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']
                saved_proxies = {}
                for var in proxy_vars:
                    if var in os.environ:
                        saved_proxies[var] = os.environ.pop(var)
                
                try:
                    from supabase import create_client
                    _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                    logger.info(f"✅ Supabase Storage initialized - Bucket: {settings.SUPABASE_STORAGE_BUCKET}")
                finally:
                    # Restore proxy environment variables
                    for var, value in saved_proxies.items():
                        os.environ[var] = value
            else:
                logger.warning("⚠️ Supabase URL or Service Key not configured. Using local storage.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase Storage: {e}")
            logger.warning("⚠️ Falling back to local storage.")
    
    return _supabase_client

# Local storage fallback
UPLOAD_DIR = Path("uploads/bulk-processing")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class FileMetadata(BaseModel):
    """File metadata with path and original filename"""
    path: str
    filename: str


class CreateJobWithFilesRequest(BaseModel):
    """Request body for creating a job with uploaded files"""
    jobName: str
    uploadPath: str  # The session path (supabase://bucket/session-id or local path)
    sessionId: str   # The upload session ID
    documentType: Optional[str] = None  # 'bank_statement', 'identity_document', 'form', 'general'


@router.post("/upload-files")
async def upload_files(
    files: List[UploadFile] = File(...),
    job_name: Optional[str] = Form(None)
):
    """
    Upload PDF files for bulk processing
    
    Returns list of file paths that can be used to create a job
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Create a unique session folder for this upload batch
    session_id = str(uuid.uuid4())
    
    uploaded_files = []
    filename_mapping = {}  # Map storage filename to original filename
    
    try:
        for file in files:
            # Validate PDF
            if not file.filename.lower().endswith('.pdf'):
                logger.warning(f"Skipping non-PDF file: {file.filename}")
                continue
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_ext = Path(file.filename).suffix
            unique_filename = f"{file_id}{file_ext}"
            storage_path = f"{session_id}/{unique_filename}"
            
            # Store filename mapping
            filename_mapping[unique_filename] = file.filename
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Get Supabase client
            supabase = get_supabase_client()
            
            if supabase:
                # Upload to Supabase Storage
                try:
                    result = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
                        path=storage_path,
                        file=file_content,
                        file_options={"content-type": "application/pdf"}
                    )
                    
                    # Get public URL
                    public_url = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(storage_path)
                    
                    logger.info(f"✅ Uploaded to Supabase Storage: {storage_path}")
                    
                    uploaded_files.append({
                        "filename": file.filename,
                        "path": storage_path,  # Store relative path in DB
                        "url": public_url,  # Public URL for access
                        "size": file_size,
                        "storage_type": "supabase",
                        "original_filename": file.filename,  # Preserve original name
                        "storage_filename": unique_filename  # UUID filename in storage
                    })
                    
                except Exception as storage_error:
                    logger.error(f"❌ Failed to upload to Supabase Storage: {storage_error}")
                    raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(storage_error)}")
            else:
                # Fallback: Save to local filesystem
                session_dir = UPLOAD_DIR / session_id
                session_dir.mkdir(parents=True, exist_ok=True)
                file_path = session_dir / unique_filename
                
                with open(file_path, "wb") as buffer:
                    buffer.write(file_content)
                
                logger.info(f"✅ Saved to local storage: {file_path}")
                
                uploaded_files.append({
                    "filename": file.filename,
                    "path": str(file_path),
                    "size": file_size,
                    "storage_type": "local",
                    # Also include original fields for compatibility
                "original_filename": file.filename,
                "stored_filename": unique_filename,
                "file_path": str(file_path),
                "file_size": file_path.stat().st_size
            })
            
            logger.info(f"✅ Uploaded: {file.filename} → {session_id}/{unique_filename}")
        
        # Upload filename mapping to Supabase Storage if using Supabase
        supabase = get_supabase_client()
        if supabase and filename_mapping:
            import json
            mapping_content = json.dumps(filename_mapping).encode('utf-8')
            mapping_path = f"{session_id}/.filenames.json"
            try:
                supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
                    path=mapping_path,
                    file=mapping_content,
                    file_options={"content-type": "application/json"}
                )
                logger.info(f"✅ Uploaded filename mapping: {mapping_path}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to upload filename mapping: {e}")
        
        return {
            "success": True,
            "session_id": session_id,
            "upload_path": f"supabase://{settings.SUPABASE_STORAGE_BUCKET}/{session_id}" if get_supabase_client() else str(UPLOAD_DIR / session_id),
            "files": uploaded_files,
            "total_files": len(uploaded_files),
            "message": f"Uploaded {len(uploaded_files)} files successfully"
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/create-job-with-files")
async def create_job_with_files(
    request: CreateJobWithFilesRequest = Body(...)
):
    """
    Create a bulk processing job with uploaded files
    
    Accepts JSON body with jobName, uploadPath, and sessionId
    """
    from app.services.simple_job_service import get_simple_job_service
    
    job_name = request.jobName
    upload_path = request.uploadPath  # e.g., "supabase://backendbucket/session-id"
    session_id = request.sessionId
    document_type = request.documentType
    
    try:
        job_service = get_simple_job_service()
        
        # Create job with folder source configuration
        job = await job_service.create_job({
            "name": job_name,
            "config": {
                "source": {
                    "type": "folder",  # Use folder type for discovery
                    "path": upload_path,  # Supabase path or local path
                    "recursive": False,  # Files are in the same folder
                    "file_types": ["pdf", "jpg", "jpeg", "png"]
                },
                "processing": {
                    "mode": "once",
                    "batchSize": 10
                },
                "processingOptions": {
                    "priority": 3,
                    "maxRetries": 3,
                    "enableSignatureDetection": False,
                    "parallelWorkers": 10,
                    "documentType": document_type
                },
                "notifications": {
                    "dashboardNotifications": True,
                    "completionAlerts": False,
                    "errorAlerts": True
                }
            }
        })
        
        logger.info(f"✅ Created job '{job_name}' (ID: {job['id']}) with upload path: {upload_path}")
        
        return {
            "success": True,
            "job": job,
            "message": f"Created job '{job_name}'. Start the job to begin processing uploaded files.",
            "sessionId": session_id
        }
        
    except Exception as e:
        logger.error(f"Job creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Job creation failed: {str(e)}")


@router.post("/test-job")
async def create_test_job():
    """
    Create a test job with a dummy PDF for testing
    Quick way to test the system without uploading files
    """
    from app.services.simple_job_service import get_simple_job_service
    
    try:
        job_service = get_simple_job_service()
        
        # Create test job
        job = await job_service.create_job({
            "name": "Test Job - Single PDF",
            "config": {
                "source": {
                    "type": "test",
                    "files": ["test.pdf"]
                },
                "processing": {
                    "mode": "once",
                    "batchSize": 10
                },
                "processingOptions": {
                    "priority": 3,
                    "maxRetries": 3,
                    "enableSignatureDetection": False,
                    "parallelWorkers": 10
                },
                "notifications": {
                    "dashboardNotifications": True,
                    "completionAlerts": False,
                    "errorAlerts": True
                }
            }
        })
        
        # Create single test document
        doc = await job_service.create_document({
            "job_id": job["id"],
            "filename": "test.pdf",
            "source_path": "test/test.pdf",  # Dummy path
            "status": "pending",
            "page_count": 5  # Dummy page count
        })
        
        return {
            "success": True,
            "job": job,
            "document": doc,
            "message": "Test job created! You can now start it from the dashboard."
        }
        
    except Exception as e:
        logger.error(f"Test job creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Test job creation failed: {str(e)}")
