-- =========================================================
-- UMA MAHESHWARI JEWELLERS - SUPABASE SCHEMA INITIALIZATION
-- Run this script in the Supabase Dashboard -> SQL Editor
-- =========================================================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'fa-gem',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    images JSONB DEFAULT '[]'::JSONB,
    weight TEXT,
    purity TEXT DEFAULT '22K 916 BIS Hallmarked',
    description TEXT,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on product category and featured for fast queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);

-- 3. Create Daily Gold Rates Table
CREATE TABLE IF NOT EXISTS public.gold_rates (
    id SERIAL PRIMARY KEY,
    rate22k NUMERIC(10, 2) NOT NULL,
    rate24k NUMERIC(10, 2) NOT NULL,
    last_updated TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD')
);

-- Insert initial benchmark gold rates if not already present
INSERT INTO public.gold_rates (id, rate22k, rate24k, last_updated)
VALUES (1, 6650.00, 7255.00, TO_CHAR(NOW(), 'YYYY-MM-DD'))
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_rates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Public read access for everyone
CREATE POLICY "Public Read Categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Public Read Products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Public Read Gold Rates" ON public.gold_rates
    FOR SELECT USING (true);

-- 6. RLS Policies: Authenticated / Service Role can modify
CREATE POLICY "Admin All Categories" ON public.categories
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Admin All Products" ON public.products
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Admin All Gold Rates" ON public.gold_rates
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 7. Supabase Storage Bucket setup for Product Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
CREATE POLICY "Public Read Product Images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admin Insert Product Images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' 
        AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );

CREATE POLICY "Admin Delete Product Images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-images' 
        AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );
