-- Create document_folder_relationships table for AI-powered smart folder organization
-- This table stores the automatic document-to-folder assignments made by AI

CREATE TABLE IF NOT EXISTS public.document_folder_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.smart_folders(id) ON DELETE CASCADE,
  confidence_score NUMERIC DEFAULT 0,
  is_auto_assigned BOOLEAN DEFAULT true,
  assigned_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, folder_id)
);

-- Add RLS policies
ALTER TABLE public.document_folder_relationships ENABLE ROW LEVEL SECURITY;

-- Users can see relationships for documents they own
CREATE POLICY "Users view own document relationships" 
  ON public.document_folder_relationships 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id 
      AND (d.uploaded_by = auth.uid() OR d.user_id = auth.uid())
    )
  );

-- Users can insert relationships for documents they own
CREATE POLICY "Users create document relationships" 
  ON public.document_folder_relationships 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id 
      AND (d.uploaded_by = auth.uid() OR d.user_id = auth.uid())
    )
  );

-- Users can delete relationships for documents they own
CREATE POLICY "Users delete document relationships" 
  ON public.document_folder_relationships 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d 
      WHERE d.id = document_id 
      AND (d.uploaded_by = auth.uid() OR d.user_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_folder_rel_document ON public.document_folder_relationships(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_folder_rel_folder ON public.document_folder_relationships(folder_id);
CREATE INDEX IF NOT EXISTS idx_doc_folder_rel_confidence ON public.document_folder_relationships(confidence_score DESC);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_doc_folder_rel_updated_at ON public.document_folder_relationships;
CREATE TRIGGER update_doc_folder_rel_updated_at
  BEFORE UPDATE ON public.document_folder_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE public.document_folder_relationships IS 'Stores AI-generated document-to-folder assignments for smart folders';
COMMENT ON COLUMN public.document_folder_relationships.confidence_score IS 'AI confidence score (0-1) for the folder assignment';
COMMENT ON COLUMN public.document_folder_relationships.is_auto_assigned IS 'True if assigned by AI, false if manually assigned';
COMMENT ON COLUMN public.document_folder_relationships.assigned_reason IS 'Human-readable reason for the assignment (e.g., "Content type: invoice")';
