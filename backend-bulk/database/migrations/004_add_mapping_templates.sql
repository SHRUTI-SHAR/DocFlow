-- Migration: Add mapping_templates table
-- Purpose: Store Excel-to-field mappings for reuse

-- Create mapping_templates table
CREATE TABLE IF NOT EXISTS mapping_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100),           -- For auto-matching similar document types
    excel_columns JSONB NOT NULL,         -- Array of column headers: ["Company Name", "Reg No", "Date"]
    field_mappings JSONB NOT NULL,        -- Mapping object: {"Company Name": "field_name", ...}
    sample_file_name VARCHAR(255),        -- Original template filename
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mapping_templates_user_id 
ON mapping_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_document_type 
ON mapping_templates(document_type);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_name 
ON mapping_templates(name);

-- Add comment
COMMENT ON TABLE mapping_templates IS 'Stores Excel column to extracted field mappings for reuse';
