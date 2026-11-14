-- ============================================================================
-- EvolutionSMP Initial Seed Data (Migrated verbatim from src/lib/data.ts & UI)
-- Run after 001_initial_schema.sql in Supabase SQL Editor, OR run `npm run db:seed`
-- Safe to run repeatedly (uses ON CONFLICT DO NOTHING / DO UPDATE safely).
-- ============================================================================

INSERT INTO public.website_settings (
  key, server_name, website_name, website_tagline, java_ip, bedrock_ip, bedrock_port,
  minecraft_version, season_name, server_description, domain, store_domain,
  discord_invite_url, discord_ticket_url, discord_guild_id, youtube_url, tiktok_url, twitter_url,
  social_links, announcement_enabled, announcement_text, announcement_url,
  hero_title, hero_subtitle, hero_bg_image, hero_buttons,
  footer_description, footer_copyright
) VALUES (
  'default',
  'EvolutionSMP',
  'EvolutionSMP',
  'The Next Generation Minecraft Network',
  'play.evolutionsmp.fun',
  'bedrock.evolutionsmp.fun',
  19132,
  '1.20.x - 1.21.x',
  'Season 4: Ascension',
  'The premier Minecraft Survival network for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.',
  'evolutionsmp.fun',
  'store.evolutionsmp.fun',
  'https://discord.gg/uT5KsTKBuQ',
  'https://discord.com/channels/1325336468415184947/1567940098140676159',
  '123456789012345678',
  'https://youtube.com/@evolutionsmp',
  'https://tiktok.com/@evolutionsmp',
  'https://twitter.com/evolutionsmp',
  '[{"label":"Discord","url":"https://discord.gg/uT5KsTKBuQ"},{"label":"YouTube","url":"https://youtube.com/@evolutionsmp"},{"label":"TikTok","url":"https://tiktok.com/@evolutionsmp"}]'::jsonb,
  FALSE,
  'Season 4: Ascension is now live on Java & Bedrock!',
  '/news',
  'YOUR ADVENTURE STARTS HERE.',
  'The premier Minecraft Survival SMP for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.',
  '/images/hero-bg-v2.jpg',
  '[{"label":"Store","url":"/store","style":"glass","external":false},{"label":"Discord","url":"https://discord.gg/uT5KsTKBuQ","style":"glass","external":true},{"label":"GET SUPPORT","url":"https://discord.com/channels/1325336468415184947/1567940098140676159","style":"primary","external":true}]'::jsonb,
  'The premier Minecraft Survival network for Java & Bedrock. You can''t imagine what''s coming next. Experience player economy, custom features, teams, crates, and community.',
  'EvolutionSMP Network. All rights reserved.'
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.coin_config (
  key, min_custom_coins, max_custom_coins, base_rate_per_coin, discount_tiers, delivery_command_template, tebex_package_id
) VALUES (
  'default',
  50,
  50000,
  0.005000,
  '[{"minCoins":5000,"unitRate":0.001398},{"minCoins":2500,"unitRate":0.001996},{"minCoins":1000,"unitRate":0.00299},{"minCoins":500,"unitRate":0.00398},{"minCoins":250,"unitRate":0.00396}]'::jsonb,
  'eco give {username} {coins}',
  ''
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.server_statistics (
  key, total_registered_players, online_players, max_players, total_votes, java_online, bedrock_online, data_source, last_synced_at
) VALUES (
  'default', 240000, 1148, 2000, 1771, TRUE, TRUE, 'manual', NOW()
) ON CONFLICT (key) DO NOTHING;

-- Store Categories
INSERT INTO public.store_categories (slug, name, description, sort_order, is_enabled) VALUES
  ('RANKS', 'Survival Rank', 'Permanent survival ranks with kits, prefixes, vaults, and quality-of-life commands.', 1, TRUE),
  ('KEYS', 'Keys & Crates', 'Unlock rare weapons, enchanted gear, and coin rewards from spawn crates.', 2, TRUE),
  ('COINS', 'Coin Shop', 'In-game currency packs and custom coin calculator with automatic volume discounts.', 3, TRUE),
  ('BUNDLES', 'Special Bundles', 'High-value seasonal bundles combining gear, keys, claim blocks, and boosters.', 4, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Store Products
INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-vip', id, 'RANKS', 'VIP Rank', 'Start your Evolution journey with essential perks, cosmetic chat glows, and priority queue.', 1.00, NULL, '#f59e0b', 'Entry Tier', 'Crown',
  '["[VIP] Vibrant Emerald Chat Prefix","Access to /fly in Hub & Survival claims","3 Extra Player Vaults & 5 Sethomes","VIP Daily Kit & Mystery Key","Priority Queue Access on full realms","Access to /workbench and /anvil commands"]'::jsonb,
  FALSE, FALSE, TRUE, 1, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-mvp', id, 'RANKS', 'MVP Rank', 'Upgraded perks, diamond armor kits, custom particle trails, and weekly reward crates.', 1.99, NULL, '#06b6d4', 'Great Value', 'Shield',
  '["[MVP] Diamond Cyan Chat Prefix","Everything in VIP tier","6 Extra Player Vaults & 12 Sethomes","Access to /feed and /condense commands","Custom Particle Auras & Wings","2x Weekly MVP Key Bundles","25% Discount on Global Auction fees"]'::jsonb,
  FALSE, FALSE, TRUE, 2, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-elite', id, 'RANKS', 'ELITE Rank', 'Emerald prestige status featuring expanded claims, utility workbench commands, and resource crates.', 2.99, NULL, '#10b981', 'Popular', 'Gem',
  '["[ELITE] Radiant Emerald Animated Prefix","Everything in VIP & MVP tiers","8 Extra Player Vaults & 18 Sethomes","Access to /craft, /smithing, and /grindstone","Daily Elite Resource Crate Key","15% Bonus on Mob & Quest Coin Earnings"]'::jsonb,
  FALSE, FALSE, TRUE, 3, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-master', id, 'RANKS', 'MASTER Rank', 'Unleash master-tier survival advantages with enchanted weaponry, increased land claims, and priority support.', 3.99, NULL, '#8b5cf6', 'Advanced', 'Sword',
  '["[MASTER] Amethyst Mystic Animated Prefix","Everything in previous tiers","10 Extra Player Vaults & 22 Sethomes","Master Combat & Mining Tool Kits","Access to /near and /compass locator","2x Weekly Master Key Bundles","30% Discount on Auction House Listing Fees"]'::jsonb,
  FALSE, FALSE, TRUE, 4, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-titan', id, 'RANKS', 'TITAN Rank', 'The definitive competitive powerhouse rank with netherite weapons, unlimited conveniences and exclusive kits.', 4.99, NULL, '#ff9a1f', 'Most Popular', 'Sword',
  '["[TITAN] Radiant Gold Animated Prefix","Everything in VIP, MVP, Elite & Master tiers","14 Extra Player Vaults & 30 Sethomes","Access to /heal (with combat timer) & /pweather","Titan Slayer Weapons & Armor Kits","Special Titan Discord Role & Private Channel","Instant Server Slot Reservation (Bypass Queue)","Free Monthly Mythic Crate Key"]'::jsonb,
  TRUE, TRUE, TRUE, 5, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-supreme', id, 'RANKS', 'SUPREME Rank', 'Legendary survival supremacy. Unrivaled utility commands, massive land expansions, and glowing netherite aura.', 5.99, NULL, '#ff3d5a', 'High Prestige', 'Crown',
  '["[SUPREME] Crimson Blaze Flaming Prefix","Everything in all lower tiers","18 Extra Player Vaults & 40 Sethomes","Access to /fly in hub and all claimed territories","Supreme Dragon Breath Particle Aura","Weekly 3x Mythic Key Deliveries","Instant Priority Ticket Queue in Discord"]'::jsonb,
  FALSE, FALSE, TRUE, 6, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'rank-evolution', id, 'RANKS', 'Evo', 'The pinnacle network prestige. Total cosmetic freedom, maxed utility, and honorary status.', 7.99, NULL, '#ec4899', 'Ultimate Prestige', 'Sparkles',
  '["[EVO] Chromatic Shifting Rainbow Prefix","ALL perks across every network realm","Unlimited Sethomes & 25 Personal Vaults","Access to /fly in ALL non-combat zones","Custom /nick with color code formatting","Exclusive Evo Mounts & Dragon Pets","Quarterly $25 Store Voucher Credit","Direct Line to Senior Staff in Discord"]'::jsonb,
  FALSE, FALSE, TRUE, 7, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/ranks'
FROM public.store_categories WHERE slug = 'RANKS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'keys-mythic-bundle', id, 'KEYS', 'Mythic Keys (5x Bundle)', 'Open the Mythic Crate at spawn for chances at legendary armor, god weapons, and coins.', 9.99, 14.99, '#ec4899', NULL, 'Key',
  '["5x Mythic Crate Keys","Guaranteed at least 1 Tier 4+ rare drop","Redeemable instantly in the Survival SMP realm","Bonus 25,000 In-Game Coins"]'::jsonb,
  FALSE, FALSE, TRUE, 8, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/keys'
FROM public.store_categories WHERE slug = 'KEYS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-custom', id, 'COINS', 'Custom Coins', 'Enter any custom coin amount you desire. Instant automatic volume discount calculation.', 1.39, 1.75, '#ff9a1f', 'Interactive Calculator', 'Coins',
  '["Purchase any amount between 50 and 50,000 Coins","Instant Server-Validated Volume Discounts (Up to 40% OFF)","Credited in-game via /eco give","Spend on player warps, chest shops, auctions & claims","No expiration date & 100% loss protected"]'::jsonb,
  FALSE, FALSE, TRUE, 9, 350, TRUE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-100', id, 'COINS', 'Starter Pack', 'The essential pocket pouch of 100 coins to kickstart your survival trading and market purchases.', 0.50, NULL, '#f59e0b', 'Starter', 'Coins',
  '["100 In-Game Survival Coins","Instant in-game delivery via /eco give","Spend on player warps and chest shops","Trade on the Global Auction House"]'::jsonb,
  FALSE, FALSE, TRUE, 10, 100, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-250', id, 'COINS', 'Basic Pack', 'A solid 250 coin balance upgrade for buying claim blocks, gear, and rare auction house listings.', 0.99, NULL, '#f59e0b', 'Value', 'Coins',
  '["250 In-Game Survival Coins","Instant delivery to your account via /eco give","Spend on player chest shops & town taxes","Trade on the Global Auction House"]'::jsonb,
  FALSE, FALSE, TRUE, 11, 250, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-500', id, 'COINS', 'Popular Pack', 'The community recommended coin sack packed with 500 funds to expand land claims and establish player shops.', 1.99, NULL, '#ff9a1f', 'Recommended', 'Coins',
  '["500 In-Game Survival Coins","★ Recommended Community Package","Instant in-game delivery within 60s","Priority transaction verification"]'::jsonb,
  TRUE, TRUE, TRUE, 12, 500, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-1000', id, 'COINS', 'Advanced Pack', 'A heavy chest of 1,000 coins allowing you to dominate auction bids, purchase god enchants, and fund mega builds.', 2.99, NULL, '#10b981', 'Best Value', 'Coins',
  '["1,000 In-Game Survival Coins","High volume coin delivery via /eco give","Unlock access to High-Roller Market Warps","Instant automatic credit in-game"]'::jsonb,
  FALSE, FALSE, TRUE, 13, 1000, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-2500', id, 'COINS', 'Premium Pack', 'Tremendous 2,500 economy balance for team leaders, town mayors, and elite marketplace tycoons.', 4.99, NULL, '#06b6d4', 'Premium', 'Coins',
  '["2,500 In-Game Survival Coins","Instant delivery to your account within 60s","Climb directly to Wealth Leaderboard ranks","Priority server delivery confirmation"]'::jsonb,
  FALSE, FALSE, TRUE, 14, 2500, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'coins-5000', id, 'COINS', 'Mega Pack', 'The ultimate vault of 5,000 coins. Massive wealth injection to buy any item in the game and build empire cities.', 6.99, NULL, '#a855f7', 'Mega Vault', 'Coins',
  '["5,000 In-Game Survival Coins","Maximum savings coin vault","Instant delivery to your account via /eco give","VIP Discord Wealth Role recognition"]'::jsonb,
  FALSE, FALSE, TRUE, 15, 5000, FALSE, NULL, 'https://store.evolutionsmp.fun/category/coins'
FROM public.store_categories WHERE slug = 'COINS' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.store_products (slug, category_id, category_slug, name, description, price, original_price, accent_color, badge, icon_name, perks, popular, featured, is_enabled, sort_order, coin_amount, is_custom_coin, bonus_percent, checkout_url)
SELECT 'bundle-season-starter', id, 'BUNDLES', 'Season 1 Ascendant Pack', 'The complete headstart package for Season 1: equipment, keys, claim blocks, and coin boost.', 9.99, NULL, '#10b981', NULL, 'PackageCheck',
  '["Full Ascendant Prot IV Diamond Gear Kit","3x Mythic Keys + 5x Rare Keys","5,000 Extra Land Claim Blocks","100,000 In-game Cash boost","1-Week 2x EXP Booster for your Survival Team"]'::jsonb,
  FALSE, FALSE, TRUE, 16, NULL, FALSE, NULL, 'https://store.evolutionsmp.fun/category/bundles'
FROM public.store_categories WHERE slug = 'BUNDLES' ON CONFLICT (slug) DO NOTHING;

-- News Posts
INSERT INTO public.news_posts (slug, title, excerpt, category, cover_image, author_name, author_role, author_skin, tags, read_time, likes, status, published_at, display_date, content) VALUES
(
  'season-4-ascension',
  'Season 4: The Ascension Survival Update is Finally Here!',
  'Prepare for our grandest season reset yet: overhauled player economy, custom land claims, enhanced 1.21 survival world generation, world bosses, and new community events.',
  'UPDATE',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  'Alex_Evo',
  'Owner & Lead Dev',
  'Notch',
  ARRAY['Survival','Season 4','Reset','Economy'],
  '4 min read',
  384,
  'published',
  '2024-11-01T12:00:00Z',
  'November 1, 2024',
  '["The wait is over! Season 4: Ascension is now officially live on EvolutionSMP Survival. Over the past two months, our engineering and build teams have worked tirelessly to reconstruct the core survival systems from the ground up.","Key highlights of Season 4 include full Minecraft 1.21 survival integration, a completely rebuilt 20,000x20,000 world border map with custom biome generation, and the introduction of Celestial Dungeons & Altars.","We''ve also overhauled our economy to make player shops and town development even more rewarding. Enjoy new custom crops, upgraded land claiming, and weekly community events across all timezones.","Join us this Saturday at 3 PM EST for the ceremonial dragon event where the top survival builder team will be awarded exclusive Ascendant titles and store credits!"]'::jsonb
),
(
  'bedrock-crossplay-engine-v2',
  'Bedrock Crossplay 2.0: Zero Delay & Custom UI',
  'Mobile, console, and Windows 10 Bedrock players now enjoy seamless custom GUI menus, zero form lag, and flawless combat hit registration.',
  'ANNOUNCEMENT',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
  'ByteSurge',
  'Anti-Cheat & Systems',
  'jeb_',
  ARRAY['Bedrock','Crossplay','Optimization'],
  '3 min read',
  247,
  'published',
  '2024-10-24T12:00:00Z',
  'October 24, 2024',
  '["We are proud to introduce our in-house Geyser and Floodgate translation pipeline, dubbed Bedrock Crossplay 2.0. Previously, console and mobile players experienced slight menu delays when browsing custom player shops and auction houses.","With Crossplay 2.0, all custom server GUIs now render as native Bedrock Forms with zero input lag. Additionally, combat hitboxes have been precisely calibrated so mobile and Java players duel on a strictly balanced mechanical footing.","Connect right now via Bedrock on bedrock.evolutionsmp.fun with the standard Bedrock port 19132!"]'::jsonb
),
(
  'survival-build-showcase',
  'Survival Town & Build Showcase: $1,500 Community Prizes',
  'Submit your survival base and town for the Season 4 Community Build & Economy Showcase.',
  'EVENT',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
  'VexorMC',
  'Operations Director',
  'Technoblade',
  ARRAY['Community','Survival','Towns','Prizes'],
  '2 min read',
  512,
  'published',
  '2024-10-15T12:00:00Z',
  'October 15, 2024',
  '["The EvolutionSMP Survival Build Showcase returns next weekend! 16 qualified player towns and builder teams will be toured and evaluated on community design, economy integration, and creativity.","1st Place: $1,000 PayPal cash + 5x Permanent Evo Ranks + Champion Town Tag in Discord.\n2nd Place: $350 PayPal cash + 5x Titan Ranks.\n3rd Place: $150 Store Credit bundle.","Registration is open in the #community-events channel on Discord until Friday 11:59 PM EST. Make sure your team captains have submitted your claim coordinates."]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Staff Members
INSERT INTO public.staff_members (slug, name, role, role_color, badge, minecraft_username, discord_username, bio, responsibilities, joined_date, sort_order, is_active) VALUES
  ('alex-evo', 'Alex_Evo', 'OWNER', '#ef4444', 'Founder & Lead Dev', 'Notch', 'AlexEvo#0001', 'Server architect, core systems developer, and community builder. Passionate about lag-free Minecraft combat experiences.', ARRAY['Network Infrastructure','Custom Plugin Development','Financials & Partnerships'], 'Feb 2023', 1, TRUE),
  ('vexor-mc', 'VexorMC', 'ADMIN', '#f59e0b', 'Operations Director', 'Technoblade', 'Vexor#9999', 'Oversees day-to-day community operations, season tournament broadcasts, and balance adjustments across all realms.', ARRAY['Staff Supervision','Season Reset Logistics','Community Events & Tournaments'], 'Apr 2023', 2, TRUE),
  ('bytesurge', 'ByteSurge', 'DEVELOPER', '#06b6d4', 'Security & Anti-Cheat', 'jeb_', 'ByteSurge#1337', 'Machine learning anti-cheat maintainer and high-performance packet pipeline engineer ensuring pure fair play.', ARRAY['Vulcan Anti-Cheat Matrix','Crossplay Proxy Stability','Database Sync & Backups'], 'Aug 2023', 3, TRUE),
  ('kyra-craft', 'Kyra_Craft', 'SR. MOD', '#8b5cf6', 'Head of Moderation', 'Alex', 'KyraCraft#2024', 'Dedicated to maintaining a welcoming, non-toxic, and competitive environment. Lead investigator for ban appeals.', ARRAY['Player Support Tickets','Ban & Mute Appeals','Moderator Training Academy'], 'Nov 2023', 4, TRUE),
  ('zephyr-evo', 'Zephyr_Evo', 'MODERATOR', '#10b981', 'Lead Builder & Lore', 'Dinnerbone', 'Zephyr#4421', 'Creator of the iconic spawn castles, seasonal dungeons, and hidden lore scavenger hunts throughout the realms.', ARRAY['Spawn Builds & Arenas','In-game Live Moderation','Bug Report Triage'], 'Jan 2024', 5, TRUE),
  ('lumina-guard', 'LuminaGuard', 'MODERATOR', '#10b981', 'Community Guard', 'Mumbo', 'Lumina#7788', 'Active in-game moderator monitoring chat filters, answering new player questions, and organizing weekly minigames.', ARRAY['Chat Moderation','Discord Support Desk','Event Host'], 'May 2024', 6, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Rule Categories & Rules
INSERT INTO public.rule_categories (slug, name, icon_name, sort_order, is_enabled) VALUES
  ('conduct', 'General Community & Chat', 'MessageSquare', 1, TRUE),
  ('fairplay', 'Gameplay, Exploits & Cheats', 'ShieldAlert', 2, TRUE),
  ('survival-rules', 'Land Claims, Griefing & Fair Play', 'ShieldAlert', 3, TRUE),
  ('economy', 'Real-Money Trading & Economy', 'Coins', 4, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r1-1', '1.1', 'Respectful Behavior & Harassment', 'Treat all players and staff with basic respect. Hate speech, racism, slurs, doxxing, harassment, or real-life threats will result in immediate network removal.', 'ZERO TOLERANCE', 'Permanent Network Ban without Appeal', ARRAY['Threatening real-world harm','Posting personal private information','Hate speech in chat or item renames'], 1
FROM public.rule_categories WHERE slug = 'conduct' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r1-2', '1.2', 'Spamming & Chat Flooding', 'Do not spam messages, excessively repeat characters, bypass the chat cooldown filter, or advertise external servers or unapproved Discord links.', 'LOW', '1 Hour Mute -> 24 Hour Mute -> 7 Day Ban on repeat', ARRAY[]::TEXT[], 2
FROM public.rule_categories WHERE slug = 'conduct' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r1-3', '1.3', 'Language Policy', 'English is the primary language in public global channels to allow moderators to effectively oversee conversations. Other languages may be used freely in private messages or clan chat.', 'LOW', 'Verbal Warning -> Temporary Mute', ARRAY[]::TEXT[], 3
FROM public.rule_categories WHERE slug = 'conduct' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r2-1', '2.1', 'Unfair Advantages & Blacklisted Modifications', 'The use of hacked clients (Killaura, Fly, Reach, Speed, Auto-Totem, Baritone, X-Ray texture packs) is strictly forbidden. Allowed mods include OptiFine, Sodium, Iris, Fullbright, and Lunar/Badlion Client without unapproved macros.', 'ZERO TOLERANCE', '30-Day Ban (1st Offense) -> Permanent Hardware IP Ban', ARRAY['Using X-Ray to locate bases or ores','Auto-Clickers exceeding 16 CPS','Freecam or ghost client modules'], 1
FROM public.rule_categories WHERE slug = 'fairplay' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r2-2', '2.2', 'Bug & Exploit Abuse', 'Duplicating items, bypassing region claim barriers, crashing chunk loaders, or taking advantage of unintended plugin loopholes is illegal. Report bugs immediately to staff for generous in-game reward vouchers.', 'HIGH', 'Inventory & Balance Wipe + 14 Day Ban', ARRAY[]::TEXT[], 2
FROM public.rule_categories WHERE slug = 'fairplay' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r2-3', '2.3', 'Alt Accounts & Ban Evasion', 'Playing on an alternate account while your main account is muted or banned is classified as evasion. Maximum of 2 accounts per household are permitted.', 'HIGH', 'Permanent Ban of all connected alternate accounts and doubling of original ban length', ARRAY[]::TEXT[], 3
FROM public.rule_categories WHERE slug = 'fairplay' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r3-1', '3.1', 'Combat Logging', 'Disconnecting while tagged in active combat will trigger an automated instant-kill, dropping all inventory contents at your location.', 'MEDIUM', 'Automatic in-game death penalty (System enforced)', ARRAY[]::TEXT[], 1
FROM public.rule_categories WHERE slug = 'survival-rules' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r3-2', '3.2', 'Land & Town Claim Griefing', 'Using TNT cannons, lava casts, or piston exploits to damage or alter protected player land claims is strictly prohibited.', 'HIGH', 'Rollback of damage + 7 Day Ban', ARRAY[]::TEXT[], 2
FROM public.rule_categories WHERE slug = 'survival-rules' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r3-3', '3.3', 'Spawn & Newbie Protection', 'Harassing or camping new players inside or around the spawn protection perimeter is prohibited.', 'MEDIUM', '1 Day Temp Ban', ARRAY[]::TEXT[], 3
FROM public.rule_categories WHERE slug = 'survival-rules' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r4-1', '4.1', 'Real-Money Trading (RMT)', 'Trading in-game items, currency, or claim territory for real-world currencies (PayPal, Crypto, Gift Cards) outside the official Tebex webstore is completely forbidden.', 'ZERO TOLERANCE', 'Permanent Network Ban for both buyer and seller', ARRAY[]::TEXT[], 1
FROM public.rule_categories WHERE slug = 'economy' ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.server_rules (category_id, slug, rule_number, title, description, severity, punishment, examples, sort_order)
SELECT id, 'r4-2', '4.2', 'Chargebacks & Payment Fraud', 'Filing an unauthorized chargeback or payment dispute through Tebex or your bank will trigger an instant automatic network ban across our entire proxy pool and Tebex partner servers.', 'ZERO TOLERANCE', 'Permanent Tebex Global Ban + Network Ban', ARRAY[]::TEXT[], 2
FROM public.rule_categories WHERE slug = 'economy' ON CONFLICT (slug) DO NOTHING;

-- Vote Sites
INSERT INTO public.vote_sites (slug, name, domain, url, reward, reward_description, cooldown, votes_today, is_enabled, sort_order) VALUES
  ('topg', 'TopG Network', 'topg.org', 'https://topg.org/minecraft-servers/evolutionsmp', '1x Vote Key + $1,500 Cash + 150 EXP', 'Rewarded immediately upon vote verification in-game.', '24 Hours', 342, TRUE, 1),
  ('planetmc', 'Planet Minecraft', 'planetminecraft.com', 'https://planetminecraft.com/server/evolutionsmp', '1x Vote Key + 3x Golden Apples + 150 EXP', 'Includes streak bonus progress toward monthly rewards.', '24 Hours', 419, TRUE, 2),
  ('mc-mp', 'Minecraft-MP', 'minecraft-mp.com', 'https://minecraft-mp.com/server/evolutionsmp', '1x Vote Key + 1x Mystery Shard + 150 EXP', 'Supports Java and Bedrock username voting.', '24 Hours', 288, TRUE, 3),
  ('mc-servers', 'MinecraftServers.org', 'minecraftservers.org', 'https://minecraftservers.org/server/evolutionsmp', '1x Vote Key + 5x Diamonds + 150 EXP', 'Instant key voucher delivery when online.', '24 Hours', 512, TRUE, 4),
  ('mc-index', 'Minecraft-Index', 'minecraft-index.com', 'https://minecraft-index.com/server/evolutionsmp', '1x Vote Key + 15 Min Fly Voucher + 150 EXP', 'Redeem rewards anytime with /vote in Survival.', '24 Hours', 210, TRUE, 5)
ON CONFLICT (slug) DO NOTHING;

-- Leaderboard Players
INSERT INTO public.leaderboard_players (category, rank_position, username, score, formatted_score, guild, tier, playtime_label, data_source) VALUES
  ('money', 1, 'GoldTycoon', 28450000, '$28,450,000', 'Merchants', 'diamond', '620 hrs', 'manual'),
  ('money', 2, 'DiamondHands', 21300000, '$21,300,000', 'WallStreet', 'gold', '540 hrs', 'manual'),
  ('money', 3, 'NetherBaron', 17850000, '$17,850,000', 'Syndicate', 'silver', '480 hrs', 'manual'),
  ('money', 4, 'SilverLining', 14200000, '$14,200,000', 'Merchants', 'bronze', '410 hrs', 'manual'),
  ('money', 5, 'EmeraldKing', 11900000, '$11,900,000', 'Solaris', 'standard', '370 hrs', 'manual'),
  ('money', 6, 'CraftMaster', 9850000, '$9,850,000', 'Builders', 'standard', '310 hrs', 'manual'),
  ('money', 7, 'OreHunter', 8400000, '$8,400,000', 'Miners', 'standard', '280 hrs', 'manual'),
  ('money', 8, 'BlockKing', 7200000, '$7,200,000', 'Merchants', 'standard', '250 hrs', 'manual'),
  ('playtime', 1, 'SkyOverlord', 780, '780 hrs', 'Apex', 'diamond', '780 hrs', 'manual'),
  ('playtime', 2, 'ZenithBuilder', 690, '690 hrs', 'Islanders', 'gold', '690 hrs', 'manual'),
  ('playtime', 3, 'NebulaCrafter', 620, '620 hrs', 'Apex', 'silver', '620 hrs', 'manual'),
  ('playtime', 4, 'CosmicVoid', 510, '510 hrs', 'Celestial', 'bronze', '510 hrs', 'manual'),
  ('playtime', 5, 'MysticKnight', 480, '480 hrs', 'Eclipse', 'standard', '480 hrs', 'manual'),
  ('playtime', 6, 'FrostBite99', 410, '410 hrs', 'Oblivion', 'standard', '410 hrs', 'manual'),
  ('playtime', 7, 'BlazeMaster', 390, '390 hrs', 'Vortex', 'standard', '390 hrs', 'manual'),
  ('playtime', 8, 'ShadowViper', 360, '360 hrs', 'Vortex', 'standard', '360 hrs', 'manual'),
  ('blocksMined', 1, 'ZenithBuilder', 284500, '284,500 Blocks', 'Islanders', 'diamond', '690 hrs', 'manual'),
  ('blocksMined', 2, 'SkyOverlord', 241800, '241,800 Blocks', 'Apex', 'gold', '780 hrs', 'manual'),
  ('blocksMined', 3, 'NebulaCrafter', 192000, '192,000 Blocks', 'Apex', 'silver', '620 hrs', 'manual'),
  ('blocksMined', 4, 'GoldTycoon', 165000, '165,000 Blocks', 'Merchants', 'bronze', '620 hrs', 'manual'),
  ('blocksMined', 5, 'CosmicVoid', 141000, '141,000 Blocks', 'Celestial', 'standard', '510 hrs', 'manual'),
  ('blocksMined', 6, 'EnderReaper', 125000, '125,000 Blocks', 'Syndicate', 'standard', '298 hrs', 'manual')
ON CONFLICT (category, username) DO NOTHING;

-- Homepage Sections
INSERT INTO public.homepage_sections (section_key, kicker, title, subtitle, is_enabled, sort_order, content) VALUES
(
  'hero',
  'EvolutionSMP',
  'YOUR ADVENTURE STARTS HERE.',
  'The premier Minecraft Survival SMP for Java & Bedrock. Land claims, player economy, custom features, and a thriving community.',
  TRUE,
  1,
  '{"bgImage":"/images/hero-bg-v2.jpg","line1":"YOUR ADVENTURE","line2":"STARTS HERE."}'::jsonb
),
(
  'modes',
  'Pure Minecraft Experience',
  'Survival SMP',
  'EvolutionSMP is dedicated exclusively to delivering an authentic, high-performance Survival SMP. Claim your land, master the player economy, forge custom enchantments, and build with an active community.',
  TRUE,
  2,
  '{"showcaseTitle":"Evolution Survival SMP","showcaseDescription":"Our flagship survival realm engineered for peak stability, balanced longevity, and fair gameplay. Establish safe land claims, build massive towns with your team, participate in a player-driven chest shop economy, conquer seasonal dungeon catacombs, and unlock mythic vote crates.","bannerUrl":"/images/survival-showcase-v2.jpg","versionLabel":"1.20 - 1.21.x Seamless Crossplay (Java & Bedrock)","highlights":["Player-Run Chest Shops","Grief-Free Land Claims","45+ Custom Enchants","Seasonal Dungeon Bosses","Daily Free Vote Crates","Java & Bedrock Crossplay"]}'::jsonb
),
(
  'gallery',
  'Gallery',
  'A Glimpse of the World',
  'Explore authentic screenshots captured directly inside the Evolution Survival SMP realm.',
  TRUE,
  3,
  '{"items":[{"id":"spawn","img":"/images/survival-spawn-hub-v2.jpg","caption":"Main EvolutionSMP Survival Spawn with community trading hubs"},{"id":"nether","img":"/images/survival-claims-towns-v2.jpg","caption":"Survival wilderness with protected player land claims & towns"},{"id":"arena","img":"/images/survival-community-events.jpg","caption":"Community colosseum for player events & seasonal gatherings"},{"id":"dungeons","img":"/images/survival-dungeons.jpg","caption":"Ancient survival dungeons with custom bosses and rare loot"},{"id":"world","img":"/images/survival-world-terrain.jpg","caption":"Custom World Terrain Generation","desc":"Unique landscapes, natural biomes, and immersive survival exploration."}]}'::jsonb
),
(
  'join',
  'Get Started',
  'How to Join',
  'Joining Evolution Survival SMP takes less than 30 seconds. Connect from any Java or Bedrock device.',
  TRUE,
  4,
  '{"step1Title":"Launch Minecraft","step1Desc":"Java or Bedrock, version 1.20 to 1.21+. Seamless crossplay on PC, Console, iOS, and Android.","step2Title":"Add the Server","step3Title":"Begin Your Survival","step3Desc":"Join the Survival world, claim your grief-free territory, establish your chest shops, and build with the community."}'::jsonb
),
(
  'leaderboards',
  'Hall of Fame',
  'The Best of EvolutionSMP',
  'Official survival leaderboards synchronized from our database.',
  TRUE,
  5,
  '{}'::jsonb
),
(
  'discord',
  'Community',
  'Join the Community',
  'Stay ahead with early announcements, weekly giveaways, clan tournaments with cash rewards, and 24/7 direct support with the EvolutionSMP staff.',
  TRUE,
  6,
  '{"ctaLabel":"Join Discord"}'::jsonb
),
(
  'footer',
  '24/7 Discord Support',
  'Need Help?',
  'Have questions about ranks, store purchases, bug reports, or account issues? Open a ticket directly through our Ticket King support panel on Discord.',
  TRUE,
  7,
  '{"ctaLabel":"GET SUPPORT"}'::jsonb
)
ON CONFLICT (section_key) DO NOTHING;
