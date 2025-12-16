-- Add missing columns to smart_folders table for CreateFolderModal compatibility

-- Add color column (alias for folder_color)
ALTER TABLE public.smart_folders 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2563eb';

-- Add is_smart column to distinguish between manual and AI-powered folders
ALTER TABLE public.smart_folders 
ADD COLUMN IF NOT EXISTS is_smart BOOLEAN DEFAULT false;

-- Add ai_criteria column for smart folder rules
ALTER TABLE public.smart_folders 
ADD COLUMN IF NOT EXISTS ai_criteria JSONB DEFAULT NULL;

-- Update existing records to have default color if folder_color is set
UPDATE public.smart_folders 
SET color = COALESCE(folder_color, '#2563eb') 
WHERE color IS NULL;

-- Create a trigger to sync color and folder_color columns
CREATE OR REPLACE FUNCTION sync_folder_colors()
RETURNS TRIGGER AS $$
BEGIN
  -- When color is updated, update folder_color too
  IF NEW.color IS NOT NULL AND NEW.color != OLD.color THEN
    NEW.folder_color := NEW.color;
  END IF;
  
  -- When folder_color is updated, update color too
  IF NEW.folder_color IS NOT NULL AND NEW.folder_color != OLD.folder_color THEN
    NEW.color := NEW.folder_color;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_folder_colors_trigger ON public.smart_folders;
CREATE TRIGGER sync_folder_colors_trigger
  BEFORE UPDATE ON public.smart_folders
  FOR EACH ROW
  EXECUTE FUNCTION sync_folder_colors();
