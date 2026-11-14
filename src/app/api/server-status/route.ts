import { NextResponse } from "next/server";
import { getPublicServerStats, getWebsiteSettings } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export async function GET() {
  try {
    const [settings, dbStats] = await Promise.all([
      getWebsiteSettings(),
      getPublicServerStats(),
    ]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const javaUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(settings.javaIp)}`;
    const bedrockUrl = `https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(settings.bedrockIp)}:${settings.bedrockPort}`;

    let javaData: any = null;
    let bedrockData: any = null;

    try {
      const [javaRes, bedrockRes] = await Promise.allSettled([
        fetch(javaUrl, { signal: controller.signal, cache: "no-store" }),
        fetch(bedrockUrl, { signal: controller.signal, cache: "no-store" }),
      ]);

      if (javaRes.status === "fulfilled" && javaRes.value.ok) {
        javaData = await javaRes.value.json();
      }
      if (bedrockRes.status === "fulfilled" && bedrockRes.value.ok) {
        bedrockData = await bedrockRes.value.json();
      }
    } catch {
      // Timeout or network offline
    } finally {
      clearTimeout(timeoutId);
    }

    if (javaData && javaData.online) {
      const javaOnlinePlayers = Number(javaData.players?.online ?? 0);
      const bedrockOnlinePlayers = Number(bedrockData?.players?.online ?? 0);
      return NextResponse.json({
        online: true,
        isSimulated: false,
        source: "mcstatus_api",
        players: {
          online: javaOnlinePlayers,
          max: Number(javaData.players?.max ?? dbStats?.maxPlayers ?? 2000),
          list: javaData.players?.list?.map((p: any) => p.name_clean || p.name_raw) ?? [],
        },
        version: {
          name: javaData.version?.name_clean ?? settings.minecraftVersion,
          protocol: javaData.version?.protocol ?? 767,
        },
        motd: {
          raw: javaData.motd?.raw ?? settings.serverDescription,
          clean: javaData.motd?.clean ?? settings.serverDescription,
          html: javaData.motd?.html,
        },
        icon: javaData.icon,
        ping: javaData.latency ?? null,
        bedrock: {
          online: Boolean(bedrockData?.online),
          players: {
            online: bedrockOnlinePlayers,
            max: Number(bedrockData?.players?.max ?? 800),
          },
          version: bedrockData?.version?.name ?? settings.minecraftVersion,
          port: settings.bedrockPort,
        },
      });
    }

    // Fallback: return recorded database statistics if available, clearly labeled as unverified/fallback
    return NextResponse.json({
      online: dbStats?.javaOnline ?? false,
      isSimulated: true,
      source: dbStats ? `database_${dbStats.dataSource}` : "unreachable",
      simulatedNotice:
        "Live mcstatus.io check could not reach the Minecraft server; showing recorded status.",
      players: {
        online: dbStats?.onlinePlayers ?? 0,
        max: dbStats?.maxPlayers ?? 2000,
        list: [],
      },
      version: {
        name: settings.minecraftVersion,
      },
      ping: null,
      bedrock: {
        online: dbStats?.bedrockOnline ?? false,
        players: {
          online: 0,
          max: 800,
        },
        version: settings.minecraftVersion,
        port: settings.bedrockPort,
      },
    });
  } catch {
    return NextResponse.json(
      {
        online: false,
        isSimulated: true,
        source: "error",
        players: { online: 0, max: 2000, list: [] },
        bedrock: { online: false, players: { online: 0, max: 800 }, port: 19132 },
      },
      { status: 200 }
    );
  }
}
