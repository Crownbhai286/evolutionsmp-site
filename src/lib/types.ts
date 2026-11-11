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
  tags: string[];
  likes: number;
}
