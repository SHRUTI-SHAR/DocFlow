-- ============================================
-- Migration: Fix update_document_field_statistics trigger
-- Remove updated_at column reference that doesn't exist
-- ============================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_document_field_stats ON bulk_extracted_fields;

-- Drop existing function
DROP FUNCTION IF EXISTS update_document_field_statistics();

-- Recreate function WITHOUT updated_at column
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
        )
        -- Removed: updated_at = NOW() (column doesn't exist)
    WHERE id = NEW.document_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_document_field_stats
AFTER INSERT OR UPDATE ON bulk_extracted_fields
FOR EACH ROW
EXECUTE FUNCTION update_document_field_statistics();

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the fix:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_document_field_statistics';
