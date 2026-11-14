import {
  COIN_CONFIG,
  LEADERBOARD_DATA,
  NEWS_POSTS,
  RULES_DATA,
  SERVER_CONFIG,
  STAFF_MEMBERS,
  STORE_ITEMS,
  VOTE_SITES,
} from "@/lib/data";
import { createSupabasePublicClient, isSupabasePublicConfigured } from "@/lib/supabase/server";
import type {
  CoinConfigData,
  HomepageSectionData,
  LeaderboardPlayer,
  NewsPost,
  RuleSection,
  ServerStatisticsData,
  StaffMember,
  StoreCatalogItem,
  StoreCategoryItem,
  VoteSite,
  WebsiteSettingsData,
} from "@/lib/types";

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettingsData = {
  serverName: SERVER_CONFIG.name,
  websiteName: SERVER_CONFIG.name,
  websiteTagline: SERVER_CONFIG.tagline,
  javaIp: SERVER_CONFIG.javaIp,
  bedrockIp: SERVER_CONFIG.bedrockIp,
  bedrockPort: SERVER_CONFIG.bedrockPort,
  minecraftVersion: SERVER_CONFIG.targetVersion,
  seasonName: SERVER_CONFIG.season,
  serverDescription:
    "The premier Minecraft Survival network for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.",
  domain: SERVER_CONFIG.domain,
  storeDomain: SERVER_CONFIG.storeDomain,
  discordInviteUrl: SERVER_CONFIG.discordInvite,
  discordTicketUrl: SERVER_CONFIG.discordTicketPanelUrl,
  discordGuildId: SERVER_CONFIG.discordGuildId,
  youtubeUrl: SERVER_CONFIG.youtubeUrl,
  tiktokUrl: SERVER_CONFIG.tiktokUrl,
  twitterUrl: SERVER_CONFIG.twitterUrl,
  socialLinks: [
    { label: "Discord", url: SERVER_CONFIG.discordInvite },
    { label: "YouTube", url: SERVER_CONFIG.youtubeUrl },
    { label: "TikTok", url: SERVER_CONFIG.tiktokUrl },
  ],
  announcementEnabled: false,
  announcementText: "",
  announcementUrl: "/news",
  heroTitle: "YOUR ADVENTURE STARTS HERE.",
  heroSubtitle:
    "The premier Minecraft Survival SMP for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.",
  heroBgImage: "/images/hero-bg-v2.jpg",
  heroButtons: [
    { label: "Store", url: "/store", style: "glass", external: false },
    { label: "Discord", url: SERVER_CONFIG.discordInvite, style: "glass", external: true },
    { label: "GET SUPPORT", url: SERVER_CONFIG.discordTicketPanelUrl, style: "primary", external: true },
  ],
  footerDescription:
    "The premier Minecraft Survival network for Java & Bedrock. You can't imagine what's coming next. Experience player economy, custom features, teams, crates, and community.",
  footerCopyright: "EvolutionSMP Network. All rights reserved.",
};

export const DEFAULT_COIN_CONFIG: CoinConfigData = {
  minCustomCoins: COIN_CONFIG.minCustomCoins,
  maxCustomCoins: COIN_CONFIG.maxCustomCoins,
  baseRatePerCoin: COIN_CONFIG.baseRatePerCoin,
  discountTiers: [
    { minCoins: 5000, unitRate: 0.001398 },
    { minCoins: 2500, unitRate: 0.001996 },
    { minCoins: 1000, unitRate: 0.00299 },
    { minCoins: 500, unitRate: 0.00398 },
    { minCoins: 250, unitRate: 0.00396 },
  ],
  deliveryCommandTemplate: "eco give {username} {coins}",
  tebexPackageId: "",
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionData[] = [
  {
    sectionKey: "hero",
    kicker: "EvolutionSMP",
    title: "YOUR ADVENTURE STARTS HERE.",
    subtitle:
      "The premier Minecraft Survival SMP for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.",
    isEnabled: true,
    sortOrder: 1,
    content: {
      bgImage: "/images/hero-bg-v2.jpg",
      line1: "YOUR ADVENTURE",
      line2: "STARTS HERE.",
    },
  },
  {
    sectionKey: "modes",
    kicker: "Pure Minecraft Experience",
    title: "Survival SMP",
    subtitle:
      "EvolutionSMP is dedicated exclusively to delivering an authentic, high-performance Survival SMP. Claim your land, master the player economy, forge custom enchantments, and build with an active community.",
    isEnabled: true,
    sortOrder: 2,
    content: {
      showcaseTitle: "Evolution Survival SMP",
      showcaseDescription:
        "Our flagship survival realm engineered for peak stability, balanced longevity, and fair gameplay. Establish safe land claims, build massive towns with your team, participate in a player-driven chest shop economy, conquer seasonal dungeon catacombs, and unlock mythic vote crates.",
      bannerUrl: "/images/survival-showcase-v2.jpg",
      versionLabel: "1.20 - 1.21.x Seamless Crossplay (Java & Bedrock)",
      highlights: [
        "Player-Run Chest Shops",
        "Grief-Free Land Claims",
        "45+ Custom Enchants",
        "Seasonal Dungeon Bosses",
        "Daily Free Vote Crates",
        "Java & Bedrock Crossplay",
      ],
    },
  },
  {
    sectionKey: "gallery",
    kicker: "Gallery",
    title: "A Glimpse of the World",
    subtitle: "Explore authentic screenshots captured directly inside the Evolution Survival SMP realm.",
    isEnabled: true,
    sortOrder: 3,
    content: {
      items: [
        {
          id: "spawn",
          img: "/images/survival-spawn-hub-v2.jpg",
          caption: "Main EvolutionSMP Survival Spawn with community trading hubs",
        },
        {
          id: "nether",
          img: "/images/survival-claims-towns-v2.jpg",
          caption: "Survival wilderness with protected player land claims & towns",
        },
        {
          id: "arena",
          img: "/images/survival-community-events.jpg",
          caption: "Community colosseum for player events & seasonal gatherings",
        },
        {
          id: "dungeons",
          img: "/images/survival-dungeons.jpg",
          caption: "Ancient survival dungeons with custom bosses and rare loot",
        },
        {
          id: "world",
          img: "/images/survival-world-terrain.jpg",
          caption: "Custom World Terrain Generation",
          desc: "Unique landscapes, natural biomes, and immersive survival exploration.",
        },
      ],
    },
  },
  {
    sectionKey: "join",
    kicker: "Get Started",
    title: "How to Join",
    subtitle: "Joining Evolution Survival SMP takes less than 30 seconds. Connect from any Java or Bedrock device.",
    isEnabled: true,
    sortOrder: 4,
    content: {
      step1Title: "Launch Minecraft",
      step1Desc: "Java or Bedrock, version 1.20 to 1.21+. Seamless crossplay on PC, Console, iOS, and Android.",
      step2Title: "Add the Server",
      step3Title: "Begin Your Survival",
      step3Desc:
        "Join the Survival world, claim your grief-free territory, establish your chest shops, and build with the community.",
    },
  },
  {
    sectionKey: "leaderboards",
    kicker: "Hall of Fame",
    title: "The Best of EvolutionSMP",
    subtitle: "Official survival leaderboards synced from the EvolutionSMP database.",
    isEnabled: true,
    sortOrder: 5,
    content: {},
  },
  {
    sectionKey: "discord",
    kicker: "Community",
    title: "Join the Community",
    subtitle:
      "Stay ahead with early announcements, weekly giveaways, clan tournaments with cash rewards, and 24/7 direct support with the EvolutionSMP staff.",
    isEnabled: true,
    sortOrder: 6,
    content: { ctaLabel: "Join Discord" },
  },
  {
    sectionKey: "footer",
    kicker: "24/7 Discord Support",
    title: "Need Help?",
    subtitle:
      "Have questions about ranks, store purchases, bug reports, or account issues? Open a ticket directly through our Ticket King support panel on Discord.",
    isEnabled: true,
    sortOrder: 7,
    content: { ctaLabel: "GET SUPPORT" },
  },
];

export function calculateDynamicCoinPrice(coins: number, cfg: CoinConfigData) {
  const safeCoins = Math.max(cfg.minCustomCoins, Math.min(coins, cfg.maxCustomCoins));
  const sortedTiers = [...cfg.discountTiers].sort((a, b) => b.minCoins - a.minCoins);
  let unitRate = cfg.baseRatePerCoin;
  for (const tier of sortedTiers) {
    if (safeCoins >= tier.minCoins) {
      unitRate = tier.unitRate;
      break;
    }
  }
  const baseTotal = safeCoins * cfg.baseRatePerCoin;
  const price = Math.max(0.5, Math.round(safeCoins * unitRate * 100) / 100);
  const originalPrice = Math.round(baseTotal * 100) / 100;
  const discountPercent =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return { price, originalPrice, discountPercent };
}

export async function getWebsiteSettings(): Promise<WebsiteSettingsData> {
  if (!isSupabasePublicConfigured()) return DEFAULT_WEBSITE_SETTINGS;
  const client = createSupabasePublicClient();
  if (!client) return DEFAULT_WEBSITE_SETTINGS;

  try {
    const { data, error } = await client
      .from("website_settings")
      .select("*")
      .eq("key", "default")
      .maybeSingle();

    if (error || !data) return DEFAULT_WEBSITE_SETTINGS;

    return {
      serverName: data.server_name || DEFAULT_WEBSITE_SETTINGS.serverName,
      websiteName: data.website_name || DEFAULT_WEBSITE_SETTINGS.websiteName,
      websiteTagline: data.website_tagline || DEFAULT_WEBSITE_SETTINGS.websiteTagline,
      javaIp: data.java_ip || DEFAULT_WEBSITE_SETTINGS.javaIp,
      bedrockIp: data.bedrock_ip || DEFAULT_WEBSITE_SETTINGS.bedrockIp,
      bedrockPort: Number(data.bedrock_port) || DEFAULT_WEBSITE_SETTINGS.bedrockPort,
      minecraftVersion: data.minecraft_version || DEFAULT_WEBSITE_SETTINGS.minecraftVersion,
      seasonName: data.season_name || DEFAULT_WEBSITE_SETTINGS.seasonName,
      serverDescription: data.server_description || DEFAULT_WEBSITE_SETTINGS.serverDescription,
      domain: data.domain || DEFAULT_WEBSITE_SETTINGS.domain,
      storeDomain: data.store_domain || DEFAULT_WEBSITE_SETTINGS.storeDomain,
      discordInviteUrl: data.discord_invite_url || DEFAULT_WEBSITE_SETTINGS.discordInviteUrl,
      discordTicketUrl: data.discord_ticket_url || DEFAULT_WEBSITE_SETTINGS.discordTicketUrl,
      discordGuildId: data.discord_guild_id ?? DEFAULT_WEBSITE_SETTINGS.discordGuildId,
      youtubeUrl: data.youtube_url ?? DEFAULT_WEBSITE_SETTINGS.youtubeUrl,
      tiktokUrl: data.tiktok_url ?? DEFAULT_WEBSITE_SETTINGS.tiktokUrl,
      twitterUrl: data.twitter_url ?? DEFAULT_WEBSITE_SETTINGS.twitterUrl,
      socialLinks: Array.isArray(data.social_links) ? data.social_links : DEFAULT_WEBSITE_SETTINGS.socialLinks,
      announcementEnabled: Boolean(data.announcement_enabled),
      announcementText: data.announcement_text || "",
      announcementUrl: data.announcement_url || "/news",
      heroTitle: data.hero_title || DEFAULT_WEBSITE_SETTINGS.heroTitle,
      heroSubtitle: data.hero_subtitle || DEFAULT_WEBSITE_SETTINGS.heroSubtitle,
      heroBgImage: data.hero_bg_image || DEFAULT_WEBSITE_SETTINGS.heroBgImage,
      heroButtons: Array.isArray(data.hero_buttons) && data.hero_buttons.length > 0
        ? data.hero_buttons
        : DEFAULT_WEBSITE_SETTINGS.heroButtons,
      footerDescription: data.footer_description || DEFAULT_WEBSITE_SETTINGS.footerDescription,
      footerCopyright: data.footer_copyright || DEFAULT_WEBSITE_SETTINGS.footerCopyright,
    };
  } catch {
    return DEFAULT_WEBSITE_SETTINGS;
  }
}

export async function getHomepageSections(): Promise<HomepageSectionData[]> {
  if (!isSupabasePublicConfigured()) return DEFAULT_HOMEPAGE_SECTIONS;
  const client = createSupabasePublicClient();
  if (!client) return DEFAULT_HOMEPAGE_SECTIONS;

  try {
    const { data, error } = await client
      .from("homepage_sections")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return DEFAULT_HOMEPAGE_SECTIONS;

    return data.map((row: any) => ({
      sectionKey: row.section_key,
      kicker: row.kicker || "",
      title: row.title || "",
      subtitle: row.subtitle || "",
      isEnabled: Boolean(row.is_enabled),
      sortOrder: Number(row.sort_order) || 0,
      content: (row.content as Record<string, unknown>) || {},
    }));
  } catch {
    return DEFAULT_HOMEPAGE_SECTIONS;
  }
}

export async function getCoinConfig(): Promise<CoinConfigData> {
  if (!isSupabasePublicConfigured()) return DEFAULT_COIN_CONFIG;
  const client = createSupabasePublicClient();
  if (!client) return DEFAULT_COIN_CONFIG;

  try {
    const { data, error } = await client
      .from("coin_config")
      .select("*")
      .eq("key", "default")
      .maybeSingle();

    if (error || !data) return DEFAULT_COIN_CONFIG;

    return {
      minCustomCoins: Number(data.min_custom_coins) || DEFAULT_COIN_CONFIG.minCustomCoins,
      maxCustomCoins: Number(data.max_custom_coins) || DEFAULT_COIN_CONFIG.maxCustomCoins,
      baseRatePerCoin: Number(data.base_rate_per_coin) || DEFAULT_COIN_CONFIG.baseRatePerCoin,
      discountTiers: Array.isArray(data.discount_tiers)
        ? data.discount_tiers
        : DEFAULT_COIN_CONFIG.discountTiers,
      deliveryCommandTemplate:
        data.delivery_command_template || DEFAULT_COIN_CONFIG.deliveryCommandTemplate,
      tebexPackageId: data.tebex_package_id || "",
    };
  } catch {
    return DEFAULT_COIN_CONFIG;
  }
}

export async function getPublicStoreData(): Promise<{
  categories: StoreCategoryItem[];
  products: StoreCatalogItem[];
  coinConfig: CoinConfigData;
}> {
  const defaultCats: StoreCategoryItem[] = [
    { id: "RANKS", slug: "RANKS", name: "Survival Rank", description: "", sortOrder: 1, isEnabled: true },
    { id: "KEYS", slug: "KEYS", name: "Keys & Crates", description: "", sortOrder: 2, isEnabled: true },
    { id: "COINS", slug: "COINS", name: "Coin Shop", description: "", sortOrder: 3, isEnabled: true },
    { id: "BUNDLES", slug: "BUNDLES", name: "Special Bundles", description: "", sortOrder: 4, isEnabled: true },
  ];

  if (!isSupabasePublicConfigured()) {
    return { categories: defaultCats, products: STORE_ITEMS, coinConfig: DEFAULT_COIN_CONFIG };
  }

  const client = createSupabasePublicClient();
  if (!client) {
    return { categories: defaultCats, products: STORE_ITEMS, coinConfig: DEFAULT_COIN_CONFIG };
  }

  try {
    const [catsRes, prodsRes, coinConfig] = await Promise.all([
      client.from("store_categories").select("*").eq("is_enabled", true).order("sort_order", { ascending: true }),
      client.from("store_products").select("*").eq("is_enabled", true).order("sort_order", { ascending: true }),
      getCoinConfig(),
    ]);

    const categories: StoreCategoryItem[] =
      catsRes.data && catsRes.data.length > 0
        ? catsRes.data.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            description: c.description || "",
            sortOrder: Number(c.sort_order) || 0,
            isEnabled: Boolean(c.is_enabled),
          }))
        : defaultCats;

    const products: StoreCatalogItem[] =
      prodsRes.data && prodsRes.data.length > 0
        ? prodsRes.data.map((p: any) => ({
            dbId: p.id,
            id: p.slug,
            slug: p.slug,
            name: p.name,
            category: p.category_slug,
            price: Number(p.price),
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            popular: Boolean(p.popular),
            featured: Boolean(p.featured),
            badge: p.badge || undefined,
            accentColor: p.accent_color || "#ff9a1f",
            description: p.description || "",
            perks: Array.isArray(p.perks) ? p.perks : [],
            icon: p.icon_name || "PackageCheck",
            imageUrl: p.image_url || null,
            checkoutUrl: p.checkout_url || "",
            coinAmount: p.coin_amount ?? undefined,
            isCustomCoin: Boolean(p.is_custom_coin),
            bonusPercent: p.bonus_percent ?? undefined,
            deliveryCommand: p.delivery_command || "",
            tebexPackageId: p.tebex_package_id || "",
            isEnabled: Boolean(p.is_enabled),
            sortOrder: Number(p.sort_order) || 0,
          }))
        : STORE_ITEMS;

    return { categories, products, coinConfig };
  } catch {
    return { categories: defaultCats, products: STORE_ITEMS, coinConfig: DEFAULT_COIN_CONFIG };
  }
}

export async function getPublishedNews(): Promise<NewsPost[]> {
  if (!isSupabasePublicConfigured()) return NEWS_POSTS;
  const client = createSupabasePublicClient();
  if (!client) return NEWS_POSTS;

  try {
    const { data, error } = await client
      .from("news_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) return NEWS_POSTS;

    return data.map((n: any) => ({
      id: n.id,
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt || "",
      category: n.category,
      date:
        n.display_date ||
        new Date(n.published_at || n.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      readTime: n.read_time || "3 min read",
      author: n.author_name || "Admin",
      authorRole: n.author_role || "Staff",
      authorSkin: n.author_skin || "Notch",
      coverImage: n.cover_image || "/images/store-banner.jpg",
      content: Array.isArray(n.content) ? n.content : [],
      contentHtml: n.content_html || undefined,
      tags: Array.isArray(n.tags) ? n.tags : [],
      likes: Number(n.likes) || 0,
      status: n.status,
    }));
  } catch {
    return NEWS_POSTS;
  }
}

export async function getPublicStaffMembers(): Promise<StaffMember[]> {
  if (!isSupabasePublicConfigured()) return STAFF_MEMBERS;
  const client = createSupabasePublicClient();
  if (!client) return STAFF_MEMBERS;

  try {
    const { data, error } = await client
      .from("staff_members")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return STAFF_MEMBERS;

    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      roleColor: s.role_color || "#10b981",
      badge: s.badge || "",
      discord: s.discord_username || "",
      bio: s.bio || "",
      skinName: s.avatar_url || s.minecraft_username || "Steve",
      responsibilities: Array.isArray(s.responsibilities) ? s.responsibilities : [],
      joinedDate: s.joined_date || "2024",
    }));
  } catch {
    return STAFF_MEMBERS;
  }
}

export async function getPublicRules(): Promise<RuleSection[]> {
  if (!isSupabasePublicConfigured()) return RULES_DATA;
  const client = createSupabasePublicClient();
  if (!client) return RULES_DATA;

  try {
    const [catsRes, rulesRes] = await Promise.all([
      client.from("rule_categories").select("*").eq("is_enabled", true).order("sort_order", { ascending: true }),
      client.from("server_rules").select("*").eq("is_enabled", true).order("sort_order", { ascending: true }),
    ]);

    if (!catsRes.data || catsRes.data.length === 0) return RULES_DATA;

    return catsRes.data.map((cat: any) => ({
      id: cat.slug,
      category: cat.name,
      iconName: cat.icon_name || "ShieldAlert",
      rules: (rulesRes.data || [])
        .filter((r: any) => r.category_id === cat.id)
        .map((r: any) => ({
          id: r.id,
          number: r.rule_number,
          title: r.title,
          description: r.description,
          severity: r.severity,
          punishment: r.punishment,
          examples: Array.isArray(r.examples) ? r.examples : [],
        })),
    }));
  } catch {
    return RULES_DATA;
  }
}

export async function getPublicVoteSites(): Promise<VoteSite[]> {
  if (!isSupabasePublicConfigured()) return VOTE_SITES;
  const client = createSupabasePublicClient();
  if (!client) return VOTE_SITES;

  try {
    const { data, error } = await client
      .from("vote_sites")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return VOTE_SITES;

    return data.map((v: any) => ({
      id: v.id,
      name: v.name,
      domain: v.domain || "",
      url: v.url,
      reward: v.reward,
      cooldown: v.cooldown || "24 Hours",
      votesToday: Number(v.votes_today) || 0,
    }));
  } catch {
    return VOTE_SITES;
  }
}

export async function getPublicLeaderboard(): Promise<{
  boards: Record<"money" | "playtime" | "blocksMined", LeaderboardPlayer[]>;
  source: "database_manual" | "database_api" | "fallback_seed";
  lastSyncedAt: string | null;
}> {
  const fallbackBoards = {
    money: LEADERBOARD_DATA.money,
    playtime: LEADERBOARD_DATA.playtime,
    blocksMined: LEADERBOARD_DATA.blocksMined,
  };

  if (!isSupabasePublicConfigured()) {
    return { boards: fallbackBoards, source: "fallback_seed", lastSyncedAt: null };
  }

  const client = createSupabasePublicClient();
  if (!client) {
    return { boards: fallbackBoards, source: "fallback_seed", lastSyncedAt: null };
  }

  try {
    const { data, error } = await client
      .from("leaderboard_players")
      .select("*")
      .order("rank_position", { ascending: true });

    if (error || !data || data.length === 0) {
      return { boards: fallbackBoards, source: "fallback_seed", lastSyncedAt: null };
    }

    const boards: Record<"money" | "playtime" | "blocksMined", LeaderboardPlayer[]> = {
      money: [],
      playtime: [],
      blocksMined: [],
    };

    let latestSync: string | null = null;
    let hasApiSync = false;

    for (const row of data as any[]) {
      const cat = row.category as "money" | "playtime" | "blocksMined";
      if (!boards[cat]) continue;
      if (row.data_source === "minecraft_api") hasApiSync = true;
      if (row.synced_at && (!latestSync || row.synced_at > latestSync)) {
        latestSync = row.synced_at;
      }

      boards[cat].push({
        rank: Number(row.rank_position),
        username: row.username,
        uuid: row.uuid || undefined,
        score: Number(row.score),
        formattedScore: row.formatted_score || String(row.score),
        guild: row.guild || undefined,
        tier: row.tier || "standard",
        playtime: row.playtime_label || undefined,
      });
    }

    return {
      boards,
      source: hasApiSync ? "database_api" : "database_manual",
      lastSyncedAt: latestSync,
    };
  } catch {
    return { boards: fallbackBoards, source: "fallback_seed", lastSyncedAt: null };
  }
}

export async function getPublicServerStats(): Promise<ServerStatisticsData | null> {
  if (!isSupabasePublicConfigured()) return null;
  const client = createSupabasePublicClient();
  if (!client) return null;

  try {
    const { data } = await client
      .from("server_statistics")
      .select("*")
      .eq("key", "default")
      .maybeSingle();

    if (!data) return null;

    return {
      totalRegisteredPlayers: Number(data.total_registered_players) || 0,
      onlinePlayers: Number(data.online_players) || 0,
      maxPlayers: Number(data.max_players) || 2000,
      totalVotes: Number(data.total_votes) || 0,
      javaOnline: Boolean(data.java_online),
      bedrockOnline: Boolean(data.bedrock_online),
      dataSource: data.data_source || "manual",
      lastSyncedAt: data.last_synced_at || null,
    };
  } catch {
    return null;
  }
}
