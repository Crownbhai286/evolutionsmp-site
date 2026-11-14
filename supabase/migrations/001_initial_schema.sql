-- ============================================================================
-- EvolutionSMP Production PostgreSQL Schema (Supabase)
-- Migration: 001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Admin Users & Role-Based Access Control (No public signup allowed)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Admin',
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper function for RLS policies to check active admin / owner status
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2. General Website Settings (singleton row key = 'default')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE DEFAULT 'default',
  server_name TEXT NOT NULL DEFAULT 'EvolutionSMP',
  website_name TEXT NOT NULL DEFAULT 'EvolutionSMP',
  website_tagline TEXT NOT NULL DEFAULT 'The Next Generation Minecraft Network',
  java_ip TEXT NOT NULL DEFAULT 'play.evolutionsmp.fun',
  bedrock_ip TEXT NOT NULL DEFAULT 'bedrock.evolutionsmp.fun',
  bedrock_port INTEGER NOT NULL DEFAULT 19132 CHECK (bedrock_port BETWEEN 1 AND 65535),
  minecraft_version TEXT NOT NULL DEFAULT '1.20.x - 1.21.x',
  season_name TEXT NOT NULL DEFAULT 'Season 4: Ascension',
  server_description TEXT NOT NULL DEFAULT 'The premier Minecraft Survival network for Java & Bedrock.',
  domain TEXT NOT NULL DEFAULT 'evolutionsmp.fun',
  store_domain TEXT NOT NULL DEFAULT 'store.evolutionsmp.fun',
  discord_invite_url TEXT NOT NULL DEFAULT 'https://discord.gg/uT5KsTKBuQ',
  discord_ticket_url TEXT NOT NULL DEFAULT 'https://discord.com/channels/1325336468415184947/1567940098140676159',
  discord_guild_id TEXT NOT NULL DEFAULT '',
  youtube_url TEXT NOT NULL DEFAULT 'https://youtube.com/@evolutionsmp',
  tiktok_url TEXT NOT NULL DEFAULT 'https://tiktok.com/@evolutionsmp',
  twitter_url TEXT NOT NULL DEFAULT 'https://twitter.com/evolutionsmp',
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  announcement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  announcement_text TEXT NOT NULL DEFAULT '',
  announcement_url TEXT NOT NULL DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT 'YOUR ADVENTURE STARTS HERE.',
  hero_subtitle TEXT NOT NULL DEFAULT 'The premier Minecraft Survival SMP for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.',
  hero_bg_image TEXT NOT NULL DEFAULT '/images/hero-bg-v2.jpg',
  hero_buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_description TEXT NOT NULL DEFAULT 'The premier Minecraft Survival network for Java & Bedrock. Experience player economy, custom features, teams, crates, and community.',
  footer_copyright TEXT NOT NULL DEFAULT 'EvolutionSMP Network. All rights reserved.',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Store Categories & Products & Coin Pricing Configuration
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('RANKS', 'KEYS', 'COINS', 'BUNDLES')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_store_categories_updated_at
  BEFORE UPDATE ON public.store_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.store_categories(id) ON DELETE RESTRICT,
  category_slug TEXT NOT NULL CHECK (category_slug IN ('RANKS', 'KEYS', 'COINS', 'BUNDLES')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= price),
  accent_color TEXT NOT NULL DEFAULT '#ff9a1f',
  badge TEXT,
  image_url TEXT,
  icon_name TEXT NOT NULL DEFAULT 'PackageCheck',
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  popular BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  coin_amount INTEGER CHECK (coin_amount IS NULL OR coin_amount >= 0),
  is_custom_coin BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_percent INTEGER CHECK (bonus_percent IS NULL OR (bonus_percent >= 0 AND bonus_percent <= 100)),
  delivery_command TEXT NOT NULL DEFAULT '',
  tebex_package_id TEXT NOT NULL DEFAULT '',
  checkout_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_cat_order ON public.store_products(category_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_products_enabled ON public.store_products(is_enabled);

CREATE TRIGGER trg_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE DEFAULT 'default',
  min_custom_coins INTEGER NOT NULL DEFAULT 50 CHECK (min_custom_coins >= 1),
  max_custom_coins INTEGER NOT NULL DEFAULT 50000 CHECK (max_custom_coins >= min_custom_coins),
  base_rate_per_coin NUMERIC(10, 6) NOT NULL DEFAULT 0.005000 CHECK (base_rate_per_coin > 0),
  discount_tiers JSONB NOT NULL DEFAULT '[{"minCoins":5000,"unitRate":0.001398},{"minCoins":2500,"unitRate":0.001996},{"minCoins":1000,"unitRate":0.00299},{"minCoins":500,"unitRate":0.00398},{"minCoins":250,"unitRate":0.00396}]'::jsonb,
  delivery_command_template TEXT NOT NULL DEFAULT 'eco give {username} {coins}',
  tebex_package_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_coin_config_updated_at
  BEFORE UPDATE ON public.coin_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. News & Announcements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_html TEXT,
  category TEXT NOT NULL DEFAULT 'UPDATE' CHECK (category IN ('UPDATE', 'EVENT', 'ANNOUNCEMENT', 'MAINTENANCE')),
  cover_image TEXT NOT NULL DEFAULT '/images/store-banner.jpg',
  author_name TEXT NOT NULL DEFAULT 'Alex_Evo',
  author_role TEXT NOT NULL DEFAULT 'Administrator',
  author_skin TEXT NOT NULL DEFAULT 'Notch',
  tags TEXT[] NOT NULL DEFAULT '{}',
  read_time TEXT NOT NULL DEFAULT '3 min read',
  likes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_posts_status_pub ON public.news_posts(status, published_at DESC);

CREATE TRIGGER trg_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Staff Members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MODERATOR',
  role_color TEXT NOT NULL DEFAULT '#10b981',
  badge TEXT NOT NULL DEFAULT '',
  minecraft_username TEXT NOT NULL DEFAULT 'Steve',
  discord_username TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  joined_date TEXT NOT NULL DEFAULT '2024',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_members_order ON public.staff_members(sort_order);

CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Server Rules & Rule Categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'ShieldAlert',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_rule_categories_updated_at
  BEFORE UPDATE ON public.rule_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.server_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.rule_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  rule_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'ZERO TOLERANCE')),
  punishment TEXT NOT NULL,
  examples TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_rules_cat_order ON public.server_rules(category_id, sort_order);

CREATE TRIGGER trg_server_rules_updated_at
  BEFORE UPDATE ON public.server_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Voting Sites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vote_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  reward TEXT NOT NULL,
  reward_description TEXT NOT NULL DEFAULT '',
  cooldown TEXT NOT NULL DEFAULT '24 Hours',
  votes_today INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_sites_order ON public.vote_sites(sort_order);

CREATE TRIGGER trg_vote_sites_updated_at
  BEFORE UPDATE ON public.vote_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Leaderboard Players (Manual / CSV / Minecraft Server API Synced)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('money', 'playtime', 'blocksMined')),
  rank_position INTEGER NOT NULL CHECK (rank_position >= 1),
  username TEXT NOT NULL,
  uuid TEXT,
  score NUMERIC(18, 2) NOT NULL DEFAULT 0,
  formatted_score TEXT NOT NULL DEFAULT '',
  guild TEXT,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('diamond', 'gold', 'silver', 'bronze', 'standard')),
  playtime_label TEXT,
  data_source TEXT NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual', 'csv_import', 'minecraft_api')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, username)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_cat_rank ON public.leaderboard_players(category, rank_position);

CREATE TRIGGER trg_leaderboard_players_updated_at
  BEFORE UPDATE ON public.leaderboard_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Homepage Sections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE CHECK (section_key IN ('hero', 'modes', 'gallery', 'join', 'leaderboards', 'discord', 'footer')),
  kicker TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Media Files (Supabase Storage metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'media',
  folder TEXT NOT NULL DEFAULT 'general' CHECK (folder IN ('banners', 'products', 'staff', 'gallery', 'news', 'general')),
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_files_folder ON public.media_files(folder, created_at DESC);

CREATE TRIGGER trg_media_files_updated_at
  BEFORE UPDATE ON public.media_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. Server Statistics (singleton row key = 'default')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.server_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE DEFAULT 'default',
  total_registered_players INTEGER NOT NULL DEFAULT 0,
  online_players INTEGER NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 2000,
  total_votes INTEGER NOT NULL DEFAULT 0,
  java_online BOOLEAN NOT NULL DEFAULT TRUE,
  bedrock_online BOOLEAN NOT NULL DEFAULT TRUE,
  data_source TEXT NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual', 'mcstatus_api', 'minecraft_plugin')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_server_statistics_updated_at
  BEFORE UPDATE ON public.server_statistics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin Users: only active admins can view; only owners can mutate
CREATE POLICY "Admins read admin_users" ON public.admin_users FOR SELECT USING (public.is_active_admin());
CREATE POLICY "Owners manage admin_users" ON public.admin_users FOR ALL USING (public.is_owner_admin()) WITH CHECK (public.is_owner_admin());

-- Website Settings & Coin Config & Server Statistics
CREATE POLICY "Public read website_settings" ON public.website_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins write website_settings" ON public.website_settings FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Public read coin_config" ON public.coin_config FOR SELECT USING (TRUE);
CREATE POLICY "Admins write coin_config" ON public.coin_config FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Public read server_statistics" ON public.server_statistics FOR SELECT USING (TRUE);
CREATE POLICY "Admins write server_statistics" ON public.server_statistics FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Store Categories & Products (public sees enabled, admins see all & write)
CREATE POLICY "Public read store_categories" ON public.store_categories FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write store_categories" ON public.store_categories FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Public read store_products" ON public.store_products FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write store_products" ON public.store_products FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- News Posts (public sees published, admins see all & write)
CREATE POLICY "Public read news_posts" ON public.news_posts FOR SELECT USING (status = 'published' OR public.is_active_admin());
CREATE POLICY "Admins write news_posts" ON public.news_posts FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Staff Members
CREATE POLICY "Public read staff_members" ON public.staff_members FOR SELECT USING (is_active = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write staff_members" ON public.staff_members FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Rule Categories & Server Rules
CREATE POLICY "Public read rule_categories" ON public.rule_categories FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write rule_categories" ON public.rule_categories FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Public read server_rules" ON public.server_rules FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write server_rules" ON public.server_rules FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Vote Sites
CREATE POLICY "Public read vote_sites" ON public.vote_sites FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write vote_sites" ON public.vote_sites FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Leaderboard Players
CREATE POLICY "Public read leaderboard_players" ON public.leaderboard_players FOR SELECT USING (TRUE);
CREATE POLICY "Admins write leaderboard_players" ON public.leaderboard_players FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Homepage Sections
CREATE POLICY "Public read homepage_sections" ON public.homepage_sections FOR SELECT USING (is_enabled = TRUE OR public.is_active_admin());
CREATE POLICY "Admins write homepage_sections" ON public.homepage_sections FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Media Files
CREATE POLICY "Public read media_files" ON public.media_files FOR SELECT USING (TRUE);
CREATE POLICY "Admins write media_files" ON public.media_files FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- Audit Logs (admins can read; writes occur via service role server-side)
CREATE POLICY "Admins read audit_logs" ON public.audit_logs FOR SELECT USING (public.is_active_admin());

-- ============================================================================
-- Supabase Storage Bucket & Storage Policies ('media')
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read media storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Admins upload media storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND public.is_active_admin());

CREATE POLICY "Admins update media storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND public.is_active_admin());

CREATE POLICY "Admins delete media storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND public.is_active_admin());
