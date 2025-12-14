-- Migration: Add field_order column to bulk_extracted_fields
-- Purpose: Preserve document order when displaying extracted fields

-- Add field_order column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bulk_extracted_fields' 
        AND column_name = 'field_order'
    ) THEN
        ALTER TABLE bulk_extracted_fields 
        ADD COLUMN field_order INTEGER;
        
        COMMENT ON COLUMN bulk_extracted_fields.field_order IS 'Order of field within document to preserve document structure';
    END IF;
END $$;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_bulk_extracted_fields_order 
ON bulk_extracted_fields(document_id, page_number, field_order);

-- Backfill field_order for existing data based on created_at
-- This sets order within each document based on when fields were created
UPDATE bulk_extracted_fields bf
SET field_order = subq.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY document_id 
        ORDER BY page_number ASC, created_at ASC
    ) - 1 as rn
    FROM bulk_extracted_fields
    WHERE field_order IS NULL
) subq
WHERE bf.id = subq.id;
