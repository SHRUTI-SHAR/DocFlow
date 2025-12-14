-- Migration: Add Transcript Support for Template-Based Mapping
-- Description: Adds transcript and location metadata to support intelligent field mapping
-- Date: 2025-12-07

BEGIN;

-- =====================================================
-- 1. Add transcript columns to bulk_extracted_fields
-- =====================================================
-- These will store WHERE the data was found in the document

ALTER TABLE bulk_extracted_fields
ADD COLUMN IF NOT EXISTS section_name TEXT,
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS extraction_context TEXT;

-- Create index for faster transcript search
CREATE INDEX IF NOT EXISTS idx_bulk_extracted_fields_section_name 
ON bulk_extracted_fields(section_name);

CREATE INDEX IF NOT EXISTS idx_bulk_extracted_fields_field_name_text
ON bulk_extracted_fields USING gin(to_tsvector('english', field_name));

COMMENT ON COLUMN bulk_extracted_fields.section_name IS 'Section/heading where this field was found (e.g., "1.1 Tinjauan Perusahaan")';
COMMENT ON COLUMN bulk_extracted_fields.source_location IS 'Human-readable location string (e.g., "Page 2, Section 1.1")';
COMMENT ON COLUMN bulk_extracted_fields.extraction_context IS 'Surrounding context text that helps identify this field';

-- =====================================================
-- 2. Add document-level transcript table
-- =====================================================
-- Stores a searchable transcript of the entire document

CREATE TABLE IF NOT EXISTS bulk_document_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES bulk_job_documents(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES bulk_jobs(id) ON DELETE CASCADE,
    
    -- Full transcript of the document
    full_transcript TEXT NOT NULL,
    
    -- Page-level transcripts (for faster page-specific search)
    page_transcripts JSONB DEFAULT '[]'::jsonb,
    
    -- Section index for quick lookup
    section_index JSONB DEFAULT '{}'::jsonb,
    
    -- Field location map: {field_name: {page, section, context}}
    field_locations JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    total_pages INTEGER,
    total_sections INTEGER,
    generation_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT bulk_document_transcripts_document_unique UNIQUE(document_id)
);

CREATE INDEX idx_transcript_document_id ON bulk_document_transcripts(document_id);
CREATE INDEX idx_transcript_job_id ON bulk_document_transcripts(job_id);

-- Full-text search index on transcript
CREATE INDEX idx_transcript_fulltext ON bulk_document_transcripts 
USING gin(to_tsvector('english', full_transcript));

-- JSONB indexes for fast field lookup
CREATE INDEX idx_transcript_field_locations ON bulk_document_transcripts 
USING gin(field_locations);

CREATE INDEX idx_transcript_section_index ON bulk_document_transcripts 
USING gin(section_index);

COMMENT ON TABLE bulk_document_transcripts IS 'Searchable transcript of extracted documents for template-based mapping';
COMMENT ON COLUMN bulk_document_transcripts.full_transcript IS 'Complete human-readable transcript of all extracted data';
COMMENT ON COLUMN bulk_document_transcripts.page_transcripts IS 'Array of per-page transcripts [{page: 1, transcript: "..."}]';
COMMENT ON COLUMN bulk_document_transcripts.section_index IS 'Map of section names to page numbers and field names';
COMMENT ON COLUMN bulk_document_transcripts.field_locations IS 'Quick lookup map: {field_name: {page, section, line}}';

-- =====================================================
-- 3. Enhance template_columns for keyword search
-- =====================================================
-- Add search keywords and improve mapping configuration

ALTER TABLE template_columns
ADD COLUMN IF NOT EXISTS search_keywords TEXT[],
ADD COLUMN IF NOT EXISTS data_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS extraction_strategy VARCHAR(50) DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS example_value TEXT,
ADD COLUMN IF NOT EXISTS confidence_threshold NUMERIC DEFAULT 0.5;

-- Index for array search
CREATE INDEX IF NOT EXISTS idx_template_columns_search_keywords 
ON template_columns USING gin(search_keywords);

COMMENT ON COLUMN template_columns.search_keywords IS 'Keywords to search in transcript for finding this field';
COMMENT ON COLUMN template_columns.data_type IS 'Expected data type: text, number, date, currency, yes_no';
COMMENT ON COLUMN template_columns.extraction_strategy IS 'How to extract: direct, table_lookup, calculated, derived';
COMMENT ON COLUMN template_columns.example_value IS 'Example value to help AI understand expected format';
COMMENT ON COLUMN template_columns.confidence_threshold IS 'Minimum confidence score to accept extraction (0-1)';

-- =====================================================
-- 4. Add template performance tracking
-- =====================================================
-- Track how well templates perform for optimization

CREATE TABLE IF NOT EXISTS template_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id VARCHAR NOT NULL REFERENCES extraction_templates(template_id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES bulk_job_documents(id) ON DELETE CASCADE,
    
    -- Per-column metrics
    total_columns INTEGER NOT NULL,
    mapped_columns INTEGER DEFAULT 0,
    unmapped_columns INTEGER DEFAULT 0,
    low_confidence_columns INTEGER DEFAULT 0,
    
    -- Overall scores
    average_confidence NUMERIC,
    mapping_success_rate NUMERIC,
    
    -- Processing metrics
    transcript_generation_time_ms INTEGER,
    mapping_time_ms INTEGER,
    total_processing_time_ms INTEGER,
    
    -- Error tracking
    errors JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_performance_template_id ON template_performance_metrics(template_id);
CREATE INDEX idx_template_performance_document_id ON template_performance_metrics(document_id);
CREATE INDEX idx_template_performance_success_rate ON template_performance_metrics(mapping_success_rate);

COMMENT ON TABLE template_performance_metrics IS 'Track template mapping performance for optimization';

-- =====================================================
-- 5. Update trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bulk_document_transcripts_updated_at ON bulk_document_transcripts;
CREATE TRIGGER update_bulk_document_transcripts_updated_at
    BEFORE UPDATE ON bulk_document_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. Helpful views for debugging
-- =====================================================

-- View to see all fields with their locations
CREATE OR REPLACE VIEW v_fields_with_locations AS
SELECT 
    f.id,
    f.document_id,
    f.job_id,
    f.field_name,
    f.field_value,
    f.field_type,
    f.page_number,
    f.section_name,
    f.source_location,
    f.confidence_score,
    d.filename as document_name,
    j.name as job_name
FROM bulk_extracted_fields f
JOIN bulk_job_documents d ON f.document_id = d.id
JOIN bulk_jobs j ON f.job_id = j.id
ORDER BY d.filename, f.page_number, f.field_name;

COMMENT ON VIEW v_fields_with_locations IS 'Easy view of all extracted fields with their locations';

-- View to see transcript coverage
CREATE OR REPLACE VIEW v_transcript_coverage AS
SELECT 
    j.id as job_id,
    j.name as job_name,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT t.document_id) as documents_with_transcript,
    ROUND(COUNT(DISTINCT t.document_id)::numeric / NULLIF(COUNT(DISTINCT d.id), 0) * 100, 2) as coverage_percentage
FROM bulk_jobs j
LEFT JOIN bulk_job_documents d ON j.id = d.job_id
LEFT JOIN bulk_document_transcripts t ON d.id = t.document_id
GROUP BY j.id, j.name;

COMMENT ON VIEW v_transcript_coverage IS 'Shows which documents have transcripts generated';

COMMIT;

-- =====================================================
-- Rollback script (run if needed)
-- =====================================================
/*
BEGIN;

DROP VIEW IF EXISTS v_transcript_coverage;
DROP VIEW IF EXISTS v_fields_with_locations;
DROP TABLE IF EXISTS template_performance_metrics CASCADE;
DROP TABLE IF EXISTS bulk_document_transcripts CASCADE;

ALTER TABLE bulk_extracted_fields
DROP COLUMN IF EXISTS section_name,
DROP COLUMN IF EXISTS source_location,
DROP COLUMN IF EXISTS extraction_context;

ALTER TABLE template_columns
DROP COLUMN IF EXISTS search_keywords,
DROP COLUMN IF EXISTS data_type,
DROP COLUMN IF EXISTS extraction_strategy,
DROP COLUMN IF EXISTS example_value,
DROP COLUMN IF EXISTS confidence_threshold;

COMMIT;
*/
