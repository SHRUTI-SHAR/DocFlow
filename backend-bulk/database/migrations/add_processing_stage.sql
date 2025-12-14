-- Add processing progress columns to bulk_job_documents
-- Run this in Supabase SQL Editor

ALTER TABLE bulk_job_documents 
ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(100),
ADD COLUMN IF NOT EXISTS pages_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bulk_job_documents' 
AND column_name IN ('processing_stage', 'pages_processed', 'total_pages');
