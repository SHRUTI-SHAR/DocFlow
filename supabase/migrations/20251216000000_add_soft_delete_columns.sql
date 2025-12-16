-- Add soft delete columns to documents table
-- Migration: 20251216000000_add_soft_delete_columns.sql

-- Add is_deleted column (default false for existing documents)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;

-- Add deleted_at column (nullable)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON public.documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comment to explain the soft delete functionality
COMMENT ON COLUMN public.documents.is_deleted IS 'Soft delete flag - true means document is in recycle bin';
COMMENT ON COLUMN public.documents.deleted_at IS 'Timestamp when document was moved to recycle bin';
