-- Migration: Add Granular Field Storage
-- Phase 1: Database Schema for Field-Level Data Storage
-- This enables CSV/Excel export and real-time field tracking

-- ============================================
-- Table: bulk_extracted_fields
-- The CORE table for granular field storage
-- ONE ROW PER FIELD (e.g., 3,600 rows per 60-page PDF)
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_extracted_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    document_id UUID NOT NULL REFERENCES bulk_job_documents(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES bulk_jobs(id) ON DELETE CASCADE,
    
    -- Field identification
    field_name VARCHAR(255) NOT NULL,           -- Technical name: "company_name", "loan_amount"
    field_label VARCHAR(255),                    -- Human-readable: "Company Name", "Loan Amount"
    field_type VARCHAR(50) NOT NULL,             -- "text", "number", "date", "signature", "boolean", "currency"
    field_value TEXT,                            -- The extracted value
    field_group VARCHAR(100),                    -- Optional: "applicant_info", "financial_details"
    
    -- Extraction metadata
    confidence_score DECIMAL(5,4),               -- 0.0000 to 1.0000 (e.g., 0.9500)
    page_number INTEGER,                         -- Which page this field was found on
    extraction_method VARCHAR(50),               -- "llm", "yolo", "ocr", "manual", "hybrid"
    extraction_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Processing metrics
    tokens_used INTEGER,                         -- LLM tokens consumed for this field
    processing_time_ms INTEGER,                  -- Time to extract this field (milliseconds)
    model_version VARCHAR(50),                   -- "gemini-2.0-flash-exp", etc.
    
    -- Validation & quality
    validation_status VARCHAR(50) DEFAULT 'pending',  -- "valid", "needs_review", "invalid", "pending"
    needs_manual_review BOOLEAN DEFAULT FALSE,
    validation_errors JSONB,                     -- Array of validation error messages
    review_notes TEXT,                           -- Manual reviewer notes
    
    -- Review tracking
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    -- Coordinates (optional, for UI highlighting)
    bounding_box JSONB,                          -- {x: 100, y: 200, width: 300, height: 50}
    
    -- Additional metadata
    field_metadata JSONB,                        -- Flexible storage for custom data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- Critical for fast queries on millions of rows
-- ============================================

-- Primary foreign key indexes (most common queries)
CREATE INDEX IF NOT EXISTS idx_bulk_fields_job_id 
    ON bulk_extracted_fields(job_id);

CREATE INDEX IF NOT EXISTS idx_bulk_fields_doc_id 
    ON bulk_extracted_fields(document_id);

-- Field name index (for filtering by field type)
CREATE INDEX IF NOT EXISTS idx_bulk_fields_field_name 
    ON bulk_extracted_fields(field_name);

-- Validation status index
CREATE INDEX IF NOT EXISTS idx_bulk_fields_validation 
    ON bulk_extracted_fields(validation_status);

-- Partial index for manual review queue (only rows needing review)
-- This is much faster than a full index
CREATE INDEX IF NOT EXISTS idx_bulk_fields_review 
    ON bulk_extracted_fields(needs_manual_review, created_at DESC) 
    WHERE needs_manual_review = TRUE;

-- Partial index for low confidence fields
CREATE INDEX IF NOT EXISTS idx_bulk_fields_low_confidence 
    ON bulk_extracted_fields(confidence_score, field_name) 
    WHERE confidence_score < 0.8;

-- Composite index for export queries (covers multiple columns)
-- This makes CSV/Excel export queries very fast
CREATE INDEX IF NOT EXISTS idx_bulk_fields_export 
    ON bulk_extracted_fields(job_id, document_id, field_name, created_at);

-- Index for page-based queries
CREATE INDEX IF NOT EXISTS idx_bulk_fields_page 
    ON bulk_extracted_fields(document_id, page_number);

-- Index for extraction method analytics
CREATE INDEX IF NOT EXISTS idx_bulk_fields_method 
    ON bulk_extracted_fields(extraction_method, created_at DESC);

-- GIN index for JSONB metadata searches (if needed)
CREATE INDEX IF NOT EXISTS idx_bulk_fields_metadata 
    ON bulk_extracted_fields USING GIN(field_metadata);

-- ============================================
-- Update bulk_job_documents with Summary Fields
-- Add aggregate statistics for quick access
-- ============================================
ALTER TABLE bulk_job_documents 
    ADD COLUMN IF NOT EXISTS total_fields_extracted INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fields_needing_review INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS average_confidence DECIMAL(5,4),
    ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
    ADD COLUMN IF NOT EXISTS total_tokens_used INTEGER;

-- Add comment
COMMENT ON COLUMN bulk_job_documents.total_fields_extracted IS 'Total number of fields extracted from this document';
COMMENT ON COLUMN bulk_job_documents.fields_needing_review IS 'Count of fields with needs_manual_review = true';
COMMENT ON COLUMN bulk_job_documents.average_confidence IS 'Average confidence score across all fields';

-- ============================================
-- Materialized View: Field Statistics by Job
-- Pre-computed statistics for dashboard
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS bulk_job_field_statistics AS
SELECT 
    j.id as job_id,
    j.name as job_name,
    j.user_id,
    COUNT(DISTINCT f.document_id) as documents_with_fields,
    COUNT(f.id) as total_fields_extracted,
    AVG(f.confidence_score) as average_confidence,
    STDDEV(f.confidence_score) as confidence_std_dev,
    MIN(f.confidence_score) as min_confidence,
    MAX(f.confidence_score) as max_confidence,
    SUM(f.tokens_used) as total_tokens_used,
    SUM(f.processing_time_ms) as total_processing_time_ms,
    COUNT(CASE WHEN f.needs_manual_review THEN 1 END) as fields_needing_review,
    COUNT(CASE WHEN f.validation_status = 'valid' THEN 1 END) as valid_fields,
    COUNT(CASE WHEN f.validation_status = 'invalid' THEN 1 END) as invalid_fields,
    COUNT(DISTINCT f.field_name) as unique_field_types,
    -- Field type distribution
    COUNT(CASE WHEN f.field_type = 'text' THEN 1 END) as text_fields,
    COUNT(CASE WHEN f.field_type = 'number' THEN 1 END) as number_fields,
    COUNT(CASE WHEN f.field_type = 'date' THEN 1 END) as date_fields,
    COUNT(CASE WHEN f.field_type = 'signature' THEN 1 END) as signature_fields,
    COUNT(CASE WHEN f.field_type = 'boolean' THEN 1 END) as boolean_fields,
    -- Extraction method breakdown
    COUNT(CASE WHEN f.extraction_method = 'llm' THEN 1 END) as llm_extracted,
    COUNT(CASE WHEN f.extraction_method = 'yolo' THEN 1 END) as yolo_extracted,
    COUNT(CASE WHEN f.extraction_method = 'ocr' THEN 1 END) as ocr_extracted,
    MAX(f.created_at) as last_field_extracted_at
FROM bulk_jobs j
LEFT JOIN bulk_extracted_fields f ON j.id = f.job_id
GROUP BY j.id, j.name, j.user_id;

-- Unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_field_stats_job_id 
    ON bulk_job_field_statistics(job_id);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_job_field_stats_user_id 
    ON bulk_job_field_statistics(user_id) 
    WHERE user_id IS NOT NULL;

-- ============================================
-- Function: Update Document Field Statistics
-- Automatically update summary when fields are inserted
-- ============================================
CREATE OR REPLACE FUNCTION update_document_field_statistics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bulk_job_documents
    SET 
        total_fields_extracted = (
            SELECT COUNT(*) 
            FROM bulk_extracted_fields 
            WHERE document_id = NEW.document_id
        ),
        fields_needing_review = (
            SELECT COUNT(*) 
            FROM bulk_extracted_fields 
            WHERE document_id = NEW.document_id 
            AND needs_manual_review = TRUE
        ),
        average_confidence = (
            SELECT AVG(confidence_score) 
            FROM bulk_extracted_fields 
            WHERE document_id = NEW.document_id 
            AND confidence_score IS NOT NULL
        ),
        total_tokens_used = (
            SELECT SUM(tokens_used) 
            FROM bulk_extracted_fields 
            WHERE document_id = NEW.document_id 
            AND tokens_used IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = NEW.document_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update document statistics when fields are inserted/updated
CREATE TRIGGER trigger_update_document_field_stats
AFTER INSERT OR UPDATE ON bulk_extracted_fields
FOR EACH ROW
EXECUTE FUNCTION update_document_field_statistics();

-- ============================================
-- Function: Refresh Field Statistics View
-- Call this periodically (e.g., every 5 minutes)
-- ============================================
CREATE OR REPLACE FUNCTION refresh_bulk_field_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY bulk_job_field_statistics;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS) Policies
-- Users can only see fields from their own jobs
-- ============================================
ALTER TABLE bulk_extracted_fields ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view fields from their own jobs
CREATE POLICY "Users can view own job fields" ON bulk_extracted_fields
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bulk_jobs 
            WHERE bulk_jobs.id = bulk_extracted_fields.job_id 
            AND bulk_jobs.user_id = auth.uid()
        )
    );

-- Policy: Allow inserts (workers need to write fields)
-- In production, you'd want to restrict this to service role
CREATE POLICY "Workers can insert fields" ON bulk_extracted_fields
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bulk_jobs 
            WHERE bulk_jobs.id = bulk_extracted_fields.job_id
        )
    );

-- Policy: Users can update fields they own (for manual corrections)
CREATE POLICY "Users can update own job fields" ON bulk_extracted_fields
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bulk_jobs 
            WHERE bulk_jobs.id = bulk_extracted_fields.job_id 
            AND bulk_jobs.user_id = auth.uid()
        )
    );

-- ============================================
-- Helper Function: Get Field Distribution
-- Useful for analytics queries
-- ============================================
CREATE OR REPLACE FUNCTION get_field_distribution(p_job_id UUID)
RETURNS TABLE (
    field_name VARCHAR,
    field_type VARCHAR,
    count BIGINT,
    avg_confidence DECIMAL,
    needs_review_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.field_name,
        f.field_type,
        COUNT(*) as count,
        AVG(f.confidence_score) as avg_confidence,
        COUNT(CASE WHEN f.needs_manual_review THEN 1 END) as needs_review_count
    FROM bulk_extracted_fields f
    WHERE f.job_id = p_job_id
    GROUP BY f.field_name, f.field_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper Function: Get Low Confidence Fields
-- Quick way to find fields that need review
-- ============================================
CREATE OR REPLACE FUNCTION get_low_confidence_fields(
    p_job_id UUID,
    p_threshold DECIMAL DEFAULT 0.8,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    document_id UUID,
    document_name VARCHAR,
    field_name VARCHAR,
    field_value TEXT,
    confidence_score DECIMAL,
    page_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.document_id,
        d.filename as document_name,
        f.field_name,
        f.field_value,
        f.confidence_score,
        f.page_number
    FROM bulk_extracted_fields f
    JOIN bulk_job_documents d ON f.document_id = d.id
    WHERE f.job_id = p_job_id
    AND f.confidence_score < p_threshold
    ORDER BY f.confidence_score ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments for Documentation
-- ============================================
COMMENT ON TABLE bulk_extracted_fields IS 
    'Granular field-level storage - one row per extracted field. Enables field-level queries, CSV/Excel export, and real-time progress tracking.';

COMMENT ON COLUMN bulk_extracted_fields.field_name IS 
    'Technical field identifier (e.g., "company_name", "loan_amount")';

COMMENT ON COLUMN bulk_extracted_fields.confidence_score IS 
    'AI confidence score from 0.0 to 1.0. Fields with < 0.8 typically need review.';

COMMENT ON COLUMN bulk_extracted_fields.needs_manual_review IS 
    'Flag indicating this field should be reviewed by a human';

COMMENT ON COLUMN bulk_extracted_fields.bounding_box IS 
    'JSON object with {x, y, width, height} coordinates for UI highlighting';

COMMENT ON MATERIALIZED VIEW bulk_job_field_statistics IS 
    'Pre-computed field statistics per job. Refresh every 5 minutes for dashboard performance.';

-- ============================================
-- Performance Notes
-- ============================================
-- For 1,000 PDFs with 3,600 fields each:
-- - Total rows: 3.6 million
-- - Storage: ~500 MB (with indexes: ~1 GB)
-- - INSERT performance with COPY: 100ms per document
-- - SELECT performance: Sub-second with proper indexes
-- - Export query (all fields): 2-5 seconds
