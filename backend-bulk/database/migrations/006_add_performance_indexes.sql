-- Migration: Add performance indexes for bulk processing dashboard
-- Date: 2024-12-10
-- Purpose: Fix slow job loading due to N+1 queries with Supabase pooler
--
-- ⚠️ IMPORTANT: Run each statement SEPARATELY in Supabase SQL Editor
-- The SQL Editor has a timeout limit. Copy and run ONE statement at a time.
-- Use CONCURRENTLY to avoid locking tables (doesn't block reads/writes)

-- ============================================================
-- STEP 1: Run this first (most important for job loading fix)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_job_documents_job_id_status 
ON public.bulk_job_documents(job_id, status);

-- ============================================================
-- STEP 2: Index for bulk_jobs listing
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_jobs_created_at_desc 
ON public.bulk_jobs(created_at DESC);

-- ============================================================
-- STEP 3: Index for filtering jobs by status
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_jobs_status 
ON public.bulk_jobs(status);

-- ============================================================
-- STEP 4: Partial index for review queue (optional but helpful)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_job_documents_status 
ON public.bulk_job_documents(status) 
WHERE status IN ('needs_review', 'pending', 'processing');

-- ============================================================
-- STEP 5: Index for user filtering (if you use multi-tenant)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_jobs_user_id 
ON public.bulk_jobs(user_id) 
WHERE user_id IS NOT NULL;

-- ============================================================
-- STEP 6: Extracted fields indexes (run if tables are large)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_extracted_fields_document_id 
ON public.bulk_extracted_fields(document_id);

-- ============================================================
-- STEP 7: Extracted fields by job_id
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bulk_extracted_fields_job_id 
ON public.bulk_extracted_fields(job_id);

-- ============================================================
-- STEP 8: Update statistics (run after all indexes are created)
-- ============================================================
ANALYZE public.bulk_job_documents;
ANALYZE public.bulk_jobs;
ANALYZE public.bulk_extracted_fields;
