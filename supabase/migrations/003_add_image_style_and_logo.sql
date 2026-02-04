-- Add image style column and logo KB document type
-- Run this in Supabase SQL Editor

-- Add style column to images table
ALTER TABLE images ADD COLUMN IF NOT EXISTS style TEXT DEFAULT 'minimal';

-- Update the kb_document_key enum to include brand_logo
-- First, we need to add the new value to the enum
ALTER TYPE kb_document_key ADD VALUE IF NOT EXISTS 'brand_logo';

-- Create an index on images.style for filtering
CREATE INDEX IF NOT EXISTS idx_images_style ON images(style);
