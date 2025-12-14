"""
Pydantic Schemas for API Request/Response Models
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


# Enums
class ProcessingModeType(str, Enum):
    ONCE = "once"
    CONTINUOUS = "continuous"


class SourceType(str, Enum):
    FOLDER = "folder"
    DATABASE = "database"
    CLOUD = "cloud"
    GOOGLE_DRIVE = "google_drive"
    ONEDRIVE = "onedrive"


class BulkJobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


# Request Models
class ProcessingConfig(BaseModel):
    mode: ProcessingModeType
    discovery_batch_size: int = Field(default=50, ge=1, le=1000)


class ProcessingOptions(BaseModel):
    priority: int = Field(default=3, ge=1, le=5)
    max_retries: int = Field(default=3, ge=0, le=10)
    parallel_workers: int = Field(default=10, ge=1, le=100)
    signature_detection: bool = True
    retry_delay: int = Field(default=60, ge=1)
    exponential_backoff: bool = True
    send_to_review_queue: bool = True
    custom_model: Optional[str] = None
    timeout: Optional[int] = None
    cost_tracking: bool = True
    detailed_logging: bool = False
    
    # Advanced worker configuration (per-job settings)
    worker_concurrency: int = Field(default=50, ge=1, le=100, description="Max PDFs processing simultaneously")
    worker_prefetch_multiplier: int = Field(default=2, ge=1, le=10, description="Tasks prefetched per worker")
    pages_per_thread: int = Field(default=5, ge=1, le=20, description="Pages each thread processes sequentially")
    checkpoint_interval: int = Field(default=50, ge=10, le=500, description="Save progress every N pages")


class FolderSourceConfig(BaseModel):
    path: str
    file_types: List[str] = Field(default=["pdf", "jpg", "jpeg", "png"])
    recursive: bool = True


class DatabaseSourceConfig(BaseModel):
    query: str
    connection_string: Optional[str] = None


class CloudSourceConfig(BaseModel):
    bucket: str
    prefix: Optional[str] = None
    region: Optional[str] = None


class GoogleDriveSourceConfig(BaseModel):
    folder_id: Optional[str] = None  # If None, searches entire drive
    credentials_json: Optional[str] = None  # Service account credentials as JSON string
    credentials_file: Optional[str] = None  # Path to credentials file
    token_file: Optional[str] = None  # Path to token file for OAuth
    file_types: List[str] = Field(default=["application/pdf", "image/jpeg", "image/png"])
    recursive: bool = True
    shared_drive_id: Optional[str] = None  # For shared/team drives


class OneDriveSourceConfig(BaseModel):
    folder_path: Optional[str] = None  # If None, searches entire drive root
    client_id: str  # Azure AD application client ID
    client_secret: Optional[str] = None  # For client credentials flow
    tenant_id: str  # Azure AD tenant ID
    token_file: Optional[str] = None  # Path to token file for OAuth
    file_types: List[str] = Field(default=[".pdf", ".jpg", ".jpeg", ".png"])
    recursive: bool = True
    site_id: Optional[str] = None  # For SharePoint sites
    drive_id: Optional[str] = None  # Specific drive ID


class BulkJobCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    user_id: Optional[str] = None
    source_type: SourceType
    source_config: Dict[str, Any]
    processing_config: ProcessingConfig
    processing_options: ProcessingOptions = Field(default_factory=ProcessingOptions)


class BulkJobUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    processing_options: Optional[ProcessingOptions] = None


# Response Models
class BulkJobResponse(BaseModel):
    id: str
    name: str
    user_id: Optional[str] = Field(None, alias="userId")
    source_type: str = Field(..., alias="sourceType")
    source_config: Dict[str, Any] = Field(..., alias="sourceConfig")
    processing_config: Dict[str, Any] = Field(..., alias="processingConfig")
    processing_options: Dict[str, Any] = Field(..., alias="processingOptions")
    status: str
    total_documents: int = Field(..., alias="totalDocuments")
    processed_documents: int = Field(..., alias="processedDocuments")
    failed_documents: int = Field(..., alias="failedDocuments")
    documents_needing_review: int = Field(default=0, alias="documentsNeedingReview")
    created_at: datetime = Field(..., alias="createdAt")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    @classmethod
    def from_orm(cls, obj):
        """Convert database model to response model with proper types"""
        data = {
            "id": str(obj.id),
            "name": obj.name,
            "userId": str(obj.user_id) if obj.user_id else None,
            "sourceType": obj.source_type,
            "sourceConfig": obj.source_config,
            "processingConfig": obj.processing_config,
            "processingOptions": obj.processing_options,
            "status": obj.status,
            "totalDocuments": obj.total_documents or 0,
            "processedDocuments": obj.processed_documents or 0,
            "failedDocuments": obj.failed_documents or 0,
            "createdAt": obj.created_at,
            "startedAt": obj.started_at,
            "completedAt": obj.completed_at,
            "updatedAt": obj.updated_at
        }
        return cls(**data)


class BulkJobListResponse(BaseModel):
    jobs: List[BulkJobResponse]
    total: int
    skip: int
    limit: int


class BulkJobDocumentResponse(BaseModel):
    id: str
    job_id: str = Field(..., alias="jobId")
    source_path: str = Field(..., alias="sourcePath")
    filename: str
    file_size: Optional[int] = Field(None, alias="fileSize")
    mime_type: Optional[str] = Field(None, alias="mimeType")
    document_type: Optional[str] = Field(None, alias="documentType")
    status: str
    priority: int
    retry_count: int = Field(..., alias="retryCount")
    max_retries: int = Field(..., alias="maxRetries")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    error_type: Optional[str] = Field(None, alias="errorType")
    worker_id: Optional[str] = Field(None, alias="workerId")
    created_at: datetime = Field(..., alias="createdAt")
    queued_at: Optional[datetime] = Field(None, alias="queuedAt")
    processing_started_at: Optional[datetime] = Field(None, alias="processingStartedAt")
    processing_completed_at: Optional[datetime] = Field(None, alias="processingCompletedAt")
    extraction_time_seconds: Optional[float] = Field(None, alias="extractionTimeSeconds")
    token_usage: Optional[Dict[str, Any]] = Field(None, alias="tokenUsage")
    cost_inr: Optional[float] = Field(None, alias="costInr")
    total_fields_extracted: Optional[int] = Field(None, alias="totalFieldsExtracted")
    fields_needing_review: Optional[int] = Field(None, alias="fieldsNeedingReview")
    average_confidence: Optional[float] = Field(None, alias="averageConfidence")
    processing_stage: Optional[str] = Field(None, alias="processingStage")  # Real-time progress stage
    pages_processed: Optional[int] = Field(None, alias="pagesProcessed")
    total_pages: Optional[int] = Field(None, alias="totalPages")
    
    # Alias for frontend compatibility
    name: Optional[str] = None  # Will be populated from filename
    extracted_fields_count: Optional[int] = Field(None, alias="extractedFieldsCount")
    processing_time: Optional[int] = Field(None, alias="processingTime")
    processed_at: Optional[datetime] = Field(None, alias="processedAt")
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel
    )
    
    @classmethod
    def from_orm(cls, obj):
        """Convert database model to response model with camelCase"""
        return cls(
            id=str(obj.id),
            jobId=str(obj.job_id),
            sourcePath=obj.source_path,
            filename=obj.filename,
            fileSize=obj.file_size,
            mimeType=obj.mime_type,
            documentType=obj.document_type,
            status=obj.status,
            priority=obj.priority or 3,
            retryCount=obj.retry_count or 0,
            maxRetries=obj.max_retries or 3,
            errorMessage=obj.error_message,
            errorType=obj.error_type,
            workerId=obj.worker_id,
            createdAt=obj.created_at,
            queuedAt=obj.queued_at,
            processingStartedAt=obj.processing_started_at,
            processingCompletedAt=obj.processing_completed_at,
            extractionTimeSeconds=obj.extraction_time_seconds,
            tokenUsage=obj.token_usage,
            costInr=obj.cost_inr,
            totalFieldsExtracted=obj.total_fields_extracted,
            fieldsNeedingReview=obj.fields_needing_review,
            averageConfidence=obj.average_confidence,
            processingStage=getattr(obj, 'processing_stage', None),
            pagesProcessed=getattr(obj, 'pages_processed', None),
            totalPages=getattr(obj, 'total_pages', None),
            # Frontend compatibility fields
            name=obj.filename,
            extractedFieldsCount=obj.total_fields_extracted,
            processingTime=int(obj.extraction_time_seconds * 1000) if obj.extraction_time_seconds else None,
            processedAt=obj.processing_completed_at
        )


class BulkJobDocumentListResponse(BaseModel):
    documents: List[BulkJobDocumentResponse]
    total: int
    skip: int
    limit: int


class ReviewQueueItemResponse(BaseModel):
    id: str
    document_id: str = Field(..., alias="documentId")
    job_id: str = Field(..., alias="jobId")
    reason: str
    error_message: Optional[str] = Field(None, alias="errorMessage")
    error_type: Optional[str] = Field(None, alias="errorType")
    priority: int
    status: str
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    review_notes: Optional[str] = Field(None, alias="reviewNotes")
    reviewed_at: Optional[datetime] = Field(None, alias="reviewedAt")
    reviewed_by: Optional[str] = Field(None, alias="reviewedBy")
    created_at: datetime = Field(..., alias="createdAt")
    
    # Frontend compatibility
    document_name: Optional[str] = Field(None, alias="documentName")
    job_name: Optional[str] = Field(None, alias="jobName")
    max_retries: Optional[int] = Field(None, alias="maxRetries")
    retry_count: Optional[int] = Field(None, alias="retryCount")
    failed_at: Optional[datetime] = Field(None, alias="failedAt")
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel
    )


class ReviewQueueListResponse(BaseModel):
    items: List[ReviewQueueItemResponse]
    total: int
    skip: int
    limit: int

