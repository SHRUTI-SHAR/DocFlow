-- Migration: Add document_type column to documents table
-- Date: 2025-12-08
-- Purpose: Support dynamic document type categorization

-- Add document_type column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Create index for faster queries by document type
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- Optional: Create document_types reference table for tracking all types
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    icon TEXT DEFAULT 'FileText',
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on document_types name
CREATE INDEX IF NOT EXISTS idx_document_types_name ON document_types(name);

-- Add comment for documentation
COMMENT ON COLUMN documents.document_type IS 'Document type slug detected by LLM (e.g., pan-card, aadhaar-card, invoice)';
COMMENT ON TABLE document_types IS 'Reference table for dynamically created document types';
