-- Add slug column to applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (allowing nulls for existing records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_slug ON public.applications(slug) 
WHERE slug IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_slug_lookup ON public.applications(slug);

-- Update RLS policy to allow public access by slug (for public route)
-- Note: This allows anyone to read applications by slug if they know it
-- You may want to add an is_public flag later for better control
DROP POLICY IF EXISTS "Public can view applications by slug" ON public.applications;
CREATE POLICY "Public can view applications by slug"
ON public.applications
FOR SELECT
USING (slug IS NOT NULL);