-- ============= SIMPLIFYDRIVE MIGRATION =============
-- This migrates the old schema to the new SimplifyDrive schema
-- Run this against your existing Supabase database

-- Add missing columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_hash TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Update uploaded_by from user_id for existing records
UPDATE public.documents SET uploaded_by = user_id WHERE uploaded_by IS NULL;

-- Update name from file_name for existing records
UPDATE public.documents SET name = file_name WHERE name IS NULL;

-- Update mime_type from file_type for existing records
UPDATE public.documents SET mime_type = file_type WHERE mime_type IS NULL;

-- Create indexes for SimplifyDrive performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_created ON public.documents(uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_name ON public.documents(uploaded_by, name);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by_updated ON public.documents(uploaded_by, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_size ON public.documents(file_size);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON public.documents(is_archived);

-- Create smart_folders table
CREATE TABLE IF NOT EXISTS public.smart_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  folder_color TEXT DEFAULT '#6366f1',
  filter_rules JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_system_folder BOOLEAN DEFAULT false,
  document_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own smart folders" ON public.smart_folders FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_smart_folders_user_order ON public.smart_folders(user_id, order_index);

-- Create document_tags table
CREATE TABLE IF NOT EXISTS public.document_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tags" ON public.document_tags FOR ALL USING (auth.uid() = user_id);

-- Create document_tag_assignments table
CREATE TABLE IF NOT EXISTS public.document_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.document_tags(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, tag_id)
);

ALTER TABLE public.document_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage tag assignments" ON public.document_tag_assignments FOR ALL USING (auth.uid() = assigned_by);

-- Create document_favorites table
CREATE TABLE IF NOT EXISTS public.document_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  color TEXT DEFAULT 'yellow',
  UNIQUE(document_id, user_id)
);

ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.document_favorites FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_user_id ON public.document_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_document_id ON public.document_favorites(document_id);

-- Create quick_access table
CREATE TABLE IF NOT EXISTS public.quick_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  ai_score NUMERIC DEFAULT 0,
  ai_reason TEXT,
  is_pinned BOOLEAN DEFAULT false,
  pin_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

ALTER TABLE public.quick_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quick access" ON public.quick_access FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_quick_access_user ON public.quick_access(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_access_score ON public.quick_access(ai_score DESC);

-- Create document_shortcuts table
CREATE TABLE IF NOT EXISTS public.document_shortcuts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.smart_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  shortcut_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, folder_id, user_id)
);

ALTER TABLE public.document_shortcuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shortcuts" ON public.document_shortcuts FOR ALL USING (auth.uid() = user_id);

-- Create share_links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'folder', 'workspace', 'form')),
  resource_id UUID NOT NULL,
  resource_name TEXT,
  token TEXT NOT NULL UNIQUE,
  short_code TEXT UNIQUE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'download', 'edit')),
  allow_download BOOLEAN DEFAULT false,
  allow_print BOOLEAN DEFAULT false,
  password_protected BOOLEAN DEFAULT false,
  password_hash TEXT,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own share links" ON public.share_links FOR ALL USING (auth.uid() = created_by);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);

-- Create document_processing_queue table
CREATE TABLE IF NOT EXISTS public.document_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stage TEXT NOT NULL DEFAULT 'uploaded' CHECK (stage IN ('uploaded', 'virus_scan', 'text_extraction', 'classification', 'embedding', 'indexing', 'completed', 'failed')),
  priority INTEGER DEFAULT 100,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  progress_percent INTEGER DEFAULT 0,
  stage_metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.document_processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own processing queue" ON public.document_processing_queue FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_proc_queue_pending ON public.document_processing_queue(stage, priority, created_at) WHERE completed_at IS NULL;

-- Create bulk_action_history table  
CREATE TABLE IF NOT EXISTS public.bulk_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('move', 'delete', 'tag', 'untag', 'archive', 'restore')),
  document_ids UUID[] NOT NULL,
  target_folder_id UUID,
  tag_ids UUID[],
  details JSONB DEFAULT '{}',
  document_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_action_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view bulk action history" ON public.bulk_action_history FOR ALL USING (auth.uid() = user_id);

-- Create external_shares table
CREATE TABLE IF NOT EXISTS public.external_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'folder', 'workspace')),
  resource_id UUID NOT NULL,
  resource_name TEXT,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'download', 'edit')),
  allow_download BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invitation_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage external shares" ON public.external_shares FOR ALL USING (auth.uid() = owner_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_smart_folders_updated_at ON public.smart_folders;
CREATE TRIGGER update_smart_folders_updated_at
  BEFORE UPDATE ON public.smart_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quick_access_updated_at ON public.quick_access;
CREATE TRIGGER update_quick_access_updated_at
  BEFORE UPDATE ON public.quick_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_shortcuts_updated_at ON public.document_shortcuts;
CREATE TRIGGER update_document_shortcuts_updated_at
  BEFORE UPDATE ON public.document_shortcuts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_share_links_updated_at ON public.share_links;
CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_external_shares_updated_at ON public.external_shares;
CREATE TRIGGER update_external_shares_updated_at
  BEFORE UPDATE ON public.external_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
