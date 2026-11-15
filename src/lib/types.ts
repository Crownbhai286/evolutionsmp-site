export interface ServerStatusData {
  online: boolean;
  players: {
    online: number;
    max: number;
    list?: string[];
  };
  version?: {
    name: string;
    protocol?: number;
  };
  motd?: {
    raw: string;
    clean: string;
    html?: string;
  };
  icon?: string;
  ping?: number;
  bedrock?: {
    online: boolean;
    players: {
      online: number;
      max: number;
    };
    version?: string;
    port: number;
  };
}

export interface GameMode {
  id: string;
  title: string;
  tagline: string;
  category: "PVP" | "SURVIVAL" | "ECONOMY" | "PRACTICE";
  description: string;
  playerCount: number;
  maxPlayers: number;
  status: "ONLINE" | "POPULAR" | "EVENT" | "MAINTENANCE";
  features: string[];
  bannerUrl: string;
  accentColor: string;
  badge: string;
  version: string;
}

export interface LeaderboardPlayer {
  rank: number;
  username: string;
  uuid?: string;
  score: number;
  formattedScore: string;
  guild?: string;
  tier: "diamond" | "gold" | "silver" | "bronze" | "standard";
  kills?: number;
  deaths?: number;
  kdr?: string;
  playtime?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "SR. MOD" | "MODERATOR";
  roleColor: string;
  badge: string;
  discord: string;
  bio: string;
  skinName: string;
  responsibilities: string[];
  joinedDate: string;
}

export interface RuleSection {
  id: string;
  category: string;
  iconName: string;
  rules: {
    id: string;
    number: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "ZERO TOLERANCE";
    punishment: string;
    examples?: string[];
  }[];
}

export interface VoteSite {
  id: string;
  name: string;
  domain: string;
  url: string;
  reward: string;
  cooldown: string;
  votesToday: number;
}

export interface StoreItem {
  id: string;
  name: string;
  category: "RANKS" | "KEYS" | "COINS" | "BUNDLES";
  price: number;
  originalPrice?: number;
  popular?: boolean;
  featured?: boolean;
  badge?: string;
  accentColor: string;
  description: string;
  perks: string[];
  icon: string;
  checkoutUrl: string;
  coinAmount?: number;
  isCustomCoin?: boolean;
  bonusPercent?: number;
  kitImageUrl?: string | null;
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "UPDATE" | "EVENT" | "ANNOUNCEMENT" | "MAINTENANCE";
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  authorSkin: string;
  coverImage: string;
  content: string[];
  contentHtml?: string;
  tags: string[];
  likes: number;
  status?: "draft" | "published";
}

export interface SocialLinkItem {
  label: string;
  url: string;
}

export interface HeroButtonItem {
  label: string;
  url: string;
  style: "primary" | "glass" | "white";
  external: boolean;
}

export interface WebsiteSettingsData {
  serverName: string;
  websiteName: string;
  websiteTagline: string;
  javaIp: string;
  bedrockIp: string;
  bedrockPort: number;
  minecraftVersion: string;
  seasonName: string;
  serverDescription: string;
  domain: string;
  storeDomain: string;
  discordInviteUrl: string;
  discordTicketUrl: string;
  discordGuildId: string;
  youtubeUrl: string;
  tiktokUrl: string;
  twitterUrl: string;
  socialLinks: SocialLinkItem[];
  announcementEnabled: boolean;
  announcementText: string;
  announcementUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBgImage: string;
  heroButtons: HeroButtonItem[];
  footerDescription: string;
  footerCopyright: string;
}

export interface StoreCategoryItem {
  id: string;
  slug: "RANKS" | "KEYS" | "COINS" | "BUNDLES";
  name: string;
  description: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface CoinDiscountTier {
  minCoins: number;
  unitRate: number;
}

export interface CoinConfigData {
  minCustomCoins: number;
  maxCustomCoins: number;
  baseRatePerCoin: number;
  discountTiers: CoinDiscountTier[];
  deliveryCommandTemplate: string;
  tebexPackageId: string;
}

export interface HomepageSectionData {
  sectionKey: "hero" | "modes" | "gallery" | "join" | "leaderboards" | "discord" | "footer";
  kicker: string;
  title: string;
  subtitle: string;
  isEnabled: boolean;
  sortOrder: number;
  content: Record<string, unknown>;
}

export interface ServerStatisticsData {
  totalRegisteredPlayers: number;
  onlinePlayers: number;
  maxPlayers: number;
  totalVotes: number;
  javaOnline: boolean;
  bedrockOnline: boolean;
  dataSource: "manual" | "mcstatus_api" | "minecraft_plugin";
  lastSyncedAt: string | null;
}

export interface StoreCatalogItem extends StoreItem {
  dbId?: string;
  slug?: string;
  imageUrl?: string | null;
  deliveryCommand?: string;
  tebexPackageId?: string;
  isEnabled?: boolean;
  sortOrder?: number;
  kitImageUrl?: string | null;
}
