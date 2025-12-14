-- Create function for semantic search using vector similarity
-- This function uses the IVFFlat index for efficient vector similarity search
-- REWRITTEN VERSION - Fixed bugs in original function

CREATE OR REPLACE FUNCTION search_documents_by_similarity(
    query_embedding vector(1536),
    user_id_param uuid,
    similarity_threshold float DEFAULT 0.7,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    file_type text,
    file_size bigint,
    storage_path text,
    processing_status text,
    analysis_result jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    similarity_score float
)
LANGUAGE sql
AS $$
    WITH similarity_calculations AS (
        SELECT 
            d.id,
            d.user_id,
            d.file_name,
            d.file_type,
            d.file_size,
            d.storage_path,
            d.processing_status,
            d.analysis_result,
            d.created_at,
            d.updated_at,
            -- Calculate cosine similarity: 1 - cosine_distance
            CASE 
                WHEN d.vector_embedding IS NOT NULL THEN
                    1 - (d.vector_embedding <=> query_embedding)
                ELSE 0.0
            END as similarity_score
        FROM documents d
        WHERE 
            d.user_id = user_id_param 
            AND d.vector_embedding IS NOT NULL
    ),
    filtered_results AS (
        SELECT *
        FROM similarity_calculations
        WHERE similarity_score >= similarity_threshold
    )
    SELECT 
        id,
        user_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        processing_status,
        analysis_result,
        created_at,
        updated_at,
        similarity_score
    FROM filtered_results
    ORDER BY similarity_score DESC
    LIMIT limit_count;
$$;

-- Create function for finding similar documents
CREATE OR REPLACE FUNCTION find_similar_documents(
    document_id_param uuid,
    user_id_param uuid,
    similarity_threshold float DEFAULT 0.6,
    limit_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    file_type text,
    file_size bigint,
    storage_path text,
    processing_status text,
    analysis_result jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    similarity_score float
)
LANGUAGE sql
AS $$
    WITH target_doc AS (
        SELECT vector_embedding 
        FROM documents 
        WHERE id = document_id_param AND user_id = user_id_param
    )
    SELECT 
        d.id,
        d.user_id,
        d.file_name,
        d.file_type,
        d.file_size,
        d.storage_path,
        d.processing_status,
        d.analysis_result,
        d.created_at,
        d.updated_at,
        1 - (d.vector_embedding <=> td.vector_embedding) as similarity_score
    FROM documents d, target_doc td
    WHERE 
        d.user_id = user_id_param 
        AND d.id != document_id_param
        AND d.vector_embedding IS NOT NULL
        AND 1 - (d.vector_embedding <=> td.vector_embedding) >= similarity_threshold
    ORDER BY d.vector_embedding <=> td.vector_embedding
    LIMIT limit_count;
$$;

-- Create function for hybrid search (vector + text)
CREATE OR REPLACE FUNCTION hybrid_search_documents(
    query_embedding vector(1536),
    query_text text,
    user_id_param uuid,
    similarity_threshold float DEFAULT 0.7,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    file_type text,
    file_size bigint,
    storage_path text,
    processing_status text,
    analysis_result jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    similarity_score float,
    text_match_score float
)
LANGUAGE sql
AS $$
    WITH vector_results AS (
        SELECT 
            d.id,
            d.user_id,
            d.file_name,
            d.file_type,
            d.file_size,
            d.storage_path,
            d.processing_status,
            d.analysis_result,
            d.created_at,
            d.updated_at,
            1 - (d.vector_embedding <=> query_embedding) as similarity_score,
            0.0 as text_match_score
        FROM documents d
        WHERE 
            d.user_id = user_id_param 
            AND d.vector_embedding IS NOT NULL
            AND 1 - (d.vector_embedding <=> query_embedding) >= similarity_threshold
    ),
    text_results AS (
        SELECT 
            d.id,
            d.user_id,
            d.file_name,
            d.file_type,
            d.file_size,
            d.storage_path,
            d.processing_status,
            d.analysis_result,
            d.created_at,
            d.updated_at,
            0.0 as similarity_score,
            CASE 
                WHEN d.file_name ILIKE '%' || query_text || '%' THEN 0.8
                WHEN d.analysis_result::text ILIKE '%' || query_text || '%' THEN 0.6
                ELSE 0.0
            END as text_match_score
        FROM documents d
        WHERE 
            d.user_id = user_id_param
            AND (
                d.file_name ILIKE '%' || query_text || '%' 
                OR d.analysis_result::text ILIKE '%' || query_text || '%'
            )
    )
    SELECT DISTINCT
        COALESCE(v.id, t.id) as id,
        COALESCE(v.user_id, t.user_id) as user_id,
        COALESCE(v.file_name, t.file_name) as file_name,
        COALESCE(v.file_type, t.file_type) as file_type,
        COALESCE(v.file_size, t.file_size) as file_size,
        COALESCE(v.storage_path, t.storage_path) as storage_path,
        COALESCE(v.processing_status, t.processing_status) as processing_status,
        COALESCE(v.analysis_result, t.analysis_result) as analysis_result,
        COALESCE(v.created_at, t.created_at) as created_at,
        COALESCE(v.updated_at, t.updated_at) as updated_at,
        GREATEST(COALESCE(v.similarity_score, 0), COALESCE(t.similarity_score, 0)) as similarity_score,
        GREATEST(COALESCE(v.text_match_score, 0), COALESCE(t.text_match_score, 0)) as text_match_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
    WHERE 
        COALESCE(v.similarity_score, 0) >= similarity_threshold 
        OR COALESCE(t.text_match_score, 0) > 0
    ORDER BY 
        GREATEST(COALESCE(v.similarity_score, 0), COALESCE(t.similarity_score, 0)) DESC,
        GREATEST(COALESCE(v.text_match_score, 0), COALESCE(t.text_match_score, 0)) DESC
    LIMIT limit_count;
$$;
