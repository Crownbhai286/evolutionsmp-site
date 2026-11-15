-- 003_kit_preview_image.sql
-- Adds kit_image_url column to store_products for rank kit inventory preview

ALTER TABLE public.store_products
ADD COLUMN IF NOT EXISTS kit_image_url TEXT;

COMMENT ON COLUMN public.store_products.kit_image_url IS 'Public image URL for in-game rank kit inventory preview modal';
