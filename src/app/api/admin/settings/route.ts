import { NextResponse } from "next/server";
import { requireAdminSession, revalidateAllPublicPaths } from "@/lib/auth/admin";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { settingsSchema } from "@/lib/validations";
import { DEFAULT_WEBSITE_SETTINGS } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.db
    .from("website_settings")
    .select("*")
    .eq("key", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      settings: {
        server_name: DEFAULT_WEBSITE_SETTINGS.serverName,
        website_name: DEFAULT_WEBSITE_SETTINGS.websiteName,
        website_tagline: DEFAULT_WEBSITE_SETTINGS.websiteTagline,
        java_ip: DEFAULT_WEBSITE_SETTINGS.javaIp,
        bedrock_ip: DEFAULT_WEBSITE_SETTINGS.bedrockIp,
        bedrock_port: DEFAULT_WEBSITE_SETTINGS.bedrockPort,
        minecraft_version: DEFAULT_WEBSITE_SETTINGS.minecraftVersion,
        season_name: DEFAULT_WEBSITE_SETTINGS.seasonName,
        server_description: DEFAULT_WEBSITE_SETTINGS.serverDescription,
        domain: DEFAULT_WEBSITE_SETTINGS.domain,
        store_domain: DEFAULT_WEBSITE_SETTINGS.storeDomain,
        discord_invite_url: DEFAULT_WEBSITE_SETTINGS.discordInviteUrl,
        discord_ticket_url: DEFAULT_WEBSITE_SETTINGS.discordTicketUrl,
        discord_guild_id: DEFAULT_WEBSITE_SETTINGS.discordGuildId,
        youtube_url: DEFAULT_WEBSITE_SETTINGS.youtubeUrl,
        tiktok_url: DEFAULT_WEBSITE_SETTINGS.tiktokUrl,
        twitter_url: DEFAULT_WEBSITE_SETTINGS.twitterUrl,
        social_links: DEFAULT_WEBSITE_SETTINGS.socialLinks,
        announcement_enabled: DEFAULT_WEBSITE_SETTINGS.announcementEnabled,
        announcement_text: DEFAULT_WEBSITE_SETTINGS.announcementText,
        announcement_url: DEFAULT_WEBSITE_SETTINGS.announcementUrl,
        hero_title: DEFAULT_WEBSITE_SETTINGS.heroTitle,
        hero_subtitle: DEFAULT_WEBSITE_SETTINGS.heroSubtitle,
        hero_bg_image: DEFAULT_WEBSITE_SETTINGS.heroBgImage,
        hero_buttons: DEFAULT_WEBSITE_SETTINGS.heroButtons,
        footer_description: DEFAULT_WEBSITE_SETTINGS.footerDescription,
        footer_copyright: DEFAULT_WEBSITE_SETTINGS.footerCopyright,
      },
    });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminSession();
  if (!guard.ok) return guard.response;

  const ip = getRequestIp(req);
  const rl = checkRateLimit(`admin-settings:${guard.admin.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await guard.db
    .from("website_settings")
    .upsert(
      {
        key: "default",
        ...parsed.data,
        updated_by: guard.admin.user_id,
      },
      { onConflict: "key" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAuditLog({
    adminUserId: guard.admin.id,
    adminEmail: guard.admin.email,
    adminRole: guard.admin.role,
    action: "UPDATE_SETTINGS",
    entityType: "website_settings",
    entityId: "default",
    ipAddress: ip,
  });

  revalidateAllPublicPaths();
  return NextResponse.json({ settings: data });
}
