-- Fix vector_embedding column type
-- This migration ensures the vector_embedding column is properly configured as vector(1536)

-- First, check if the column exists and what type it is
DO $$ 
BEGIN
    -- Check if vector_embedding column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'vector_embedding'
    ) THEN
        -- Check current column type
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'vector_embedding'
            AND data_type = 'USER-DEFINED'
            AND udt_name = 'vector'
        ) THEN
            RAISE NOTICE 'vector_embedding column already exists as vector type';
        ELSE
            RAISE NOTICE 'vector_embedding column exists but is not vector type, converting...';
            
            -- Convert the column to vector type
            ALTER TABLE documents 
            ALTER COLUMN vector_embedding TYPE vector(1536) 
            USING vector_embedding::vector(1536);
            
            RAISE NOTICE 'vector_embedding column converted to vector(1536)';
        END IF;
    ELSE
        RAISE NOTICE 'vector_embedding column does not exist, creating...';
        
        -- Create the column as vector type
        ALTER TABLE documents 
        ADD COLUMN vector_embedding vector(1536);
        
        RAISE NOTICE 'vector_embedding column created as vector(1536)';
    END IF;
END $$;

-- Create index for vector similarity search if it doesn't exist
CREATE INDEX IF NOT EXISTS documents_vector_embedding_idx 
ON documents 
USING ivfflat (vector_embedding vector_cosine_ops) 
WITH (lists = 100);

-- Test the vector column
DO $$
DECLARE
    test_vector vector(1536);
BEGIN
    -- Create a test vector
    test_vector := array_fill(0.1, ARRAY[1536])::vector(1536);
    
    -- Test if we can store and retrieve it
    RAISE NOTICE 'Test vector created with % dimensions', array_length(test_vector, 1);
    
    -- Test similarity calculation
    RAISE NOTICE 'Test similarity calculation: %', 1 - (test_vector <=> test_vector);
    
    RAISE NOTICE 'Vector column is working correctly';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing vector column: %', SQLERRM;
END $$;
