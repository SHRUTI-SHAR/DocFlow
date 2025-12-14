"""
SQLAlchemy Database Models
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from app.core.database import Base


class BulkJob(Base):
    """Bulk processing job model"""
    __tablename__ = "bulk_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    source_type = Column(String(50), nullable=False)  # 'folder', 'database', 'cloud'
    source_config = Column(JSON, nullable=False)
    processing_config = Column(JSON, nullable=False)  # {mode, discovery_batch_size}
    processing_options = Column(JSON, nullable=False)  # {priority, max_retries, etc.}
    status = Column(String(50), nullable=False, default="pending")  # 'pending', 'running', 'paused', etc.
    total_documents = Column(Integer, default=0)
    processed_documents = Column(Integer, default=0)
    failed_documents = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    documents = relationship("BulkJobDocument", back_populates="job", cascade="all, delete-orphan")
    logs = relationship("BulkProcessingLog", back_populates="job", cascade="all, delete-orphan")


class BulkJobDocument(Base):
    """Bulk job document model"""
    __tablename__ = "bulk_job_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=False)
    source_path = Column(Text, nullable=False)
    filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    document_type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # 'pending', 'queued', 'processing', etc.
    priority = Column(Integer, default=3)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    worker_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    queued_at = Column(DateTime(timezone=True), nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    extraction_time_seconds = Column(Float, nullable=True)
    token_usage = Column(JSON, nullable=True)
    cost_inr = Column(Float, nullable=True)
    extracted_data_id = Column(UUID(as_uuid=True), nullable=True)
    extracted_data_table = Column(String(100), nullable=True)
    
    # New fields for tracking extraction results (matching schema)
    total_fields_extracted = Column(Integer, default=0)
    fields_needing_review = Column(Integer, default=0)
    average_confidence = Column(Float, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    total_tokens_used = Column(Integer, nullable=True)
    processing_stage = Column(String(100), nullable=True)  # Current processing stage for real-time progress
    pages_processed = Column(Integer, default=0)  # Pages processed so far
    total_pages = Column(Integer, default=0)  # Total pages in document
    
    # Relationships
    job = relationship("BulkJob", back_populates="documents")
    logs = relationship("BulkProcessingLog", back_populates="document")
    review_queue_item = relationship("BulkManualReviewQueue", back_populates="document", uselist=False)


class BulkProcessingLog(Base):
    """Bulk processing log model"""
    __tablename__ = "bulk_processing_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("bulk_job_documents.id", ondelete="CASCADE"), nullable=True)
    level = Column(String(20), nullable=False)  # 'info', 'warning', 'error'
    message = Column(Text, nullable=False)
    log_metadata = Column(JSON, nullable=True)  # Renamed from 'metadata' (reserved in SQLAlchemy)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    job = relationship("BulkJob", back_populates="logs")
    document = relationship("BulkJobDocument", back_populates="logs")


class BulkExtractedField(Base):
    """Extracted field data from bulk processing"""
    __tablename__ = "bulk_extracted_fields"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("bulk_job_documents.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(255), nullable=False)
    field_label = Column(String(255), nullable=True)
    field_type = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    field_group = Column(String(255), nullable=True)
    confidence_score = Column(Float, nullable=True)
    page_number = Column(Integer, nullable=True)
    field_order = Column(Integer, nullable=True)  # Order within the document for preserving document structure
    extraction_method = Column(String(100), nullable=True)
    extraction_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    tokens_used = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    model_version = Column(String(100), nullable=True)
    validation_status = Column(String(50), default="pending")
    needs_manual_review = Column(Boolean, default=False)
    validation_errors = Column(JSON, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    bounding_box = Column(JSON, nullable=True)
    field_metadata = Column(JSON, nullable=True)
    
    # NEW: Transcript support for template-based mapping
    section_name = Column(Text, nullable=True)  # Section where field was found
    source_location = Column(Text, nullable=True)  # Human-readable location (e.g., "Page 2, Section 1.1")
    extraction_context = Column(Text, nullable=True)  # Surrounding context text
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("BulkJobDocument", backref="extracted_fields")
    job = relationship("BulkJob")


class BulkManualReviewQueue(Base):
    """Manual review queue model"""
    __tablename__ = "bulk_manual_review_queue"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("bulk_job_documents.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    priority = Column(Integer, default=3)
    status = Column(String(50), default="pending")  # 'pending', 'in_review', 'resolved', 'reprocessed'
    assigned_to = Column(UUID(as_uuid=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("BulkJobDocument", back_populates="review_queue_item")
    job = relationship("BulkJob")


class MappingTemplate(Base):
    """Excel-to-field mapping template for reuse"""
    __tablename__ = "mapping_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(String(100), nullable=True)  # For auto-matching similar docs
    excel_columns = Column(JSON, nullable=False)  # ["Company Name", "Reg No", "Date"]
    field_mappings = Column(JSON, nullable=False)  # {"Company Name": "field_name", ...}
    sample_file_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    usage_count = Column(Integer, default=0)


class BulkDocumentTranscript(Base):
    """Searchable transcript of extracted document data"""
    __tablename__ = "bulk_document_transcripts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("bulk_job_documents.id", ondelete="CASCADE"), nullable=False, unique=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("bulk_jobs.id", ondelete="CASCADE"), nullable=False)
    
    # Full transcript of the document
    full_transcript = Column(Text, nullable=False)
    
    # Page-level transcripts for faster page-specific search
    page_transcripts = Column(JSON, default=[])  # [{page: 1, transcript: "..."}]
    
    # Section index for quick lookup
    section_index = Column(JSON, default={})  # {section_name: {pages: [1,2], fields: ["field1", "field2"]}}
    
    # Field location map for fast field lookup
    field_locations = Column(JSON, default={})  # {field_name: {page: 2, section: "1.1", context: "..."}}
    
    # Metadata
    total_pages = Column(Integer, nullable=True)
    total_sections = Column(Integer, nullable=True)
    generation_time_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("BulkJobDocument", backref="transcript")
    job = relationship("BulkJob")

