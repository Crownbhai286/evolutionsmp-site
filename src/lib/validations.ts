import { z } from "zod";

const urlOrRelativeSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || val.startsWith("/") || /^https?:\/\//i.test(val),
    "Must be a valid http(s) URL or relative path starting with /"
  );

export const settingsSchema = z.object({
  server_name: z.string().trim().min(1).max(80),
  website_name: z.string().trim().min(1).max(80),
  website_tagline: z.string().trim().max(200),
  java_ip: z.string().trim().min(1).max(120),
  bedrock_ip: z.string().trim().min(1).max(120),
  bedrock_port: z.coerce.number().int().min(1).max(65535),
  minecraft_version: z.string().trim().min(1).max(60),
  season_name: z.string().trim().max(120),
  server_description: z.string().trim().max(600),
  domain: z.string().trim().min(1).max(120),
  store_domain: z.string().trim().min(1).max(120),
  discord_invite_url: urlOrRelativeSchema,
  discord_ticket_url: urlOrRelativeSchema,
  discord_guild_id: z.string().trim().max(40),
  youtube_url: urlOrRelativeSchema,
  tiktok_url: urlOrRelativeSchema,
  twitter_url: urlOrRelativeSchema,
  social_links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: urlOrRelativeSchema,
      })
    )
    .default([]),
  announcement_enabled: z.boolean().default(false),
  announcement_text: z.string().trim().max(280).default(""),
  announcement_url: urlOrRelativeSchema.default(""),
  hero_title: z.string().trim().min(1).max(120),
  hero_subtitle: z.string().trim().max(400),
  hero_bg_image: urlOrRelativeSchema,
  hero_buttons: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: urlOrRelativeSchema,
        style: z.enum(["primary", "glass", "white"]).default("glass"),
        external: z.boolean().default(false),
      })
    )
    .default([]),
  footer_description: z.string().trim().max(600),
  footer_copyright: z.string().trim().max(200),
});

export const storeCategorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.enum(["RANKS", "KEYS", "COINS", "BUNDLES"]),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).default(""),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_enabled: z.boolean().default(true),
});

export const storeProductSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only"),
  category_slug: z.enum(["RANKS", "KEYS", "COINS", "BUNDLES"]),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(""),
  price: z.coerce.number().positive("Price must be greater than 0").max(100000),
  original_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().positive().max(100000).nullable()
  ),
  accent_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#ff9a1f"),
  badge: z.string().trim().max(50).nullable().optional(),
  image_url: urlOrRelativeSchema.nullable().optional(),
  kit_image_url: urlOrRelativeSchema.nullable().optional(),
  icon_name: z.string().trim().min(1).max(40).default("PackageCheck"),
  perks: z.array(z.string().trim().min(1).max(300)).default([]),
  popular: z.boolean().default(false),
  featured: z.boolean().default(false),
  is_enabled: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  coin_amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).nullable()
  ),
  is_custom_coin: z.boolean().default(false),
  bonus_percent: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).max(100).nullable()
  ),
  delivery_command: z.string().trim().max(300).default(""),
  tebex_package_id: z.string().trim().max(80).default(""),
  checkout_url: urlOrRelativeSchema.default(""),
});

export const coinConfigSchema = z
  .object({
    min_custom_coins: z.coerce.number().int().min(1).max(100000),
    max_custom_coins: z.coerce.number().int().min(10).max(1000000),
    base_rate_per_coin: z.coerce.number().positive().max(10),
    discount_tiers: z
      .array(
        z.object({
          minCoins: z.coerce.number().int().positive(),
          unitRate: z.coerce.number().positive().max(10),
        })
      )
      .default([]),
    delivery_command_template: z.string().trim().min(1).max(300),
    tebex_package_id: z.string().trim().max(80).default(""),
  })
  .refine((d) => d.max_custom_coins >= d.min_custom_coins, {
    message: "max_custom_coins must be >= min_custom_coins",
  });

export const newsPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only"),
  title: z.string().trim().min(2).max(180),
  excerpt: z.string().trim().max(500).default(""),
  content: z.array(z.string().trim().min(1)).default([]),
  content_html: z.string().max(50000).nullable().optional(),
  category: z.enum(["UPDATE", "EVENT", "ANNOUNCEMENT", "MAINTENANCE"]),
  cover_image: urlOrRelativeSchema.default("/images/store-banner.jpg"),
  author_name: z.string().trim().min(1).max(60),
  author_role: z.string().trim().max(80).default("Staff"),
  author_skin: z.string().trim().min(1).max(32).default("Notch"),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  read_time: z.string().trim().max(30).default("3 min read"),
  status: z.enum(["draft", "published"]).default("published"),
  published_at: z.string().trim().optional(),
  display_date: z.string().trim().max(50).nullable().optional(),
});

export const staffMemberSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(60),
  role: z.string().trim().min(1).max(40),
  role_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  badge: z.string().trim().max(60).default(""),
  minecraft_username: z.string().trim().min(1).max(32),
  discord_username: z.string().trim().max(60).default(""),
  bio: z.string().trim().max(600).default(""),
  avatar_url: urlOrRelativeSchema.nullable().optional(),
  responsibilities: z.array(z.string().trim().min(1).max(100)).default([]),
  joined_date: z.string().trim().max(40).default("2024"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});

export const ruleCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(100),
  icon_name: z.string().trim().min(1).max(40).default("ShieldAlert"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_enabled: z.boolean().default(true),
});

export const serverRuleSchema = z.object({
  category_id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  rule_number: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1500),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "ZERO TOLERANCE"]),
  punishment: z.string().trim().min(1).max(200),
  examples: z.array(z.string().trim().min(1).max(250)).default([]),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_enabled: z.boolean().default(true),
});

export const voteSiteSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(80),
  domain: z.string().trim().max(120).default(""),
  url: z.string().trim().url("Must be a valid voting URL"),
  reward: z.string().trim().min(1).max(200),
  reward_description: z.string().trim().max(400).default(""),
  cooldown: z.string().trim().min(1).max(60).default("24 Hours"),
  votes_today: z.coerce.number().int().min(0).default(0),
  is_enabled: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const leaderboardPlayerSchema = z.object({
  category: z.enum(["money", "playtime", "blocksMined"]),
  rank_position: z.coerce.number().int().min(1).max(10000),
  username: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9_.*~-]+$/),
  uuid: z.string().trim().max(64).nullable().optional(),
  score: z.coerce.number().min(0),
  formatted_score: z.string().trim().max(80).optional(),
  guild: z.string().trim().max(50).nullable().optional(),
  tier: z.enum(["diamond", "gold", "silver", "bronze", "standard"]).default("standard"),
  playtime_label: z.string().trim().max(40).nullable().optional(),
  data_source: z.enum(["manual", "csv_import", "minecraft_api"]).default("manual"),
});

export const homepageSectionSchema = z.object({
  section_key: z.enum(["hero", "modes", "gallery", "join", "leaderboards", "discord", "footer"]),
  kicker: z.string().trim().max(100).default(""),
  title: z.string().trim().max(200).default(""),
  subtitle: z.string().trim().max(800).default(""),
  is_enabled: z.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).max(99).default(0),
  content: z.record(z.string(), z.unknown()).default({}),
});

export const adminUserCreateSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  display_name: z.string().trim().min(1).max(60),
  role: z.enum(["owner", "admin"]).default("admin"),
});

export const adminUserUpdateSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(60).optional(),
  role: z.enum(["owner", "admin"]).optional(),
  is_active: z.boolean().optional(),
});

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export const MEDIA_FOLDERS = [
  "banners",
  "products",
  "staff",
  "gallery",
  "news",
  "general",
] as const;

export function formatLeaderboardScore(category: "money" | "playtime" | "blocksMined", score: number): string {
  const num = new Intl.NumberFormat("en-US").format(Math.round(score));
  if (category === "money") return `$${num}`;
  if (category === "playtime") return `${num} hrs`;
  return `${num} Blocks`;
}
