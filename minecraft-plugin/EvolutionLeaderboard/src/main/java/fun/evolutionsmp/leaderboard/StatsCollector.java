package fun.evolutionsmp.leaderboard;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.Statistic;
import org.bukkit.World;
import org.bukkit.entity.Player;

import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Logger;

/**
 * Reads actual player playtime and blocks mined from Paper statistics and world/stats JSON files.
 */
public final class StatsCollector {

    private final Logger logger;
    private final BlockBreakTracker blockBreakTracker;

    public StatsCollector(Logger logger, BlockBreakTracker blockBreakTracker) {
        this.logger = logger;
        this.blockBreakTracker = blockBreakTracker;
    }

    /**
     * Resolves all known player UUIDs across online players, Bukkit cache, and stats directory.
     */
    public Set<UUID> getAllKnownPlayers() {
        Set<UUID> uuids = new HashSet<>();

        // 1. Online players
        for (Player p : Bukkit.getOnlinePlayers()) {
            uuids.add(p.getUniqueId());
        }

        // 2. Offline players recorded by Bukkit
        for (OfflinePlayer op : Bukkit.getOfflinePlayers()) {
            if (op.getUniqueId() != null) {
                uuids.add(op.getUniqueId());
            }
        }

        // 3. Scan world/stats folder
        File statsDir = getStatsDirectory();
        if (statsDir != null && statsDir.isDirectory()) {
            File[] files = statsDir.listFiles((dir, name) -> name.endsWith(".json"));
            if (files != null) {
                for (File f : files) {
                    String name = f.getName();
                    int dot = name.lastIndexOf('.');
                    String rawUuid = dot > 0 ? name.substring(0, dot) : name;
                    try {
                        uuids.add(UUID.fromString(rawUuid));
                    } catch (IllegalArgumentException ignored) {}
                }
            }
        }

        return uuids;
    }

    /**
     * Collects total playtime in hours for a player.
     */
    public double getPlaytimeHours(OfflinePlayer player) {
        if (player == null) return 0.0;

        long ticks = 0;

        // Try online player statistic first
        if (player.isOnline() && player.getPlayer() != null) {
            try {
                ticks = player.getPlayer().getStatistic(Statistic.PLAY_ONE_MINUTE);
            } catch (Throwable ignored) {}
        }

        // Try offline player statistic
        if (ticks <= 0) {
            try {
                ticks = player.getStatistic(Statistic.PLAY_ONE_MINUTE);
            } catch (Throwable ignored) {}
        }

        // If not found, read directly from world/stats/<uuid>.json
        if (ticks <= 0) {
            JsonObject statsObj = readPlayerStatsJson(player.getUniqueId());
            if (statsObj != null && statsObj.has("minecraft:custom")) {
                JsonObject custom = statsObj.getAsJsonObject("minecraft:custom");
                if (custom.has("minecraft:play_time")) {
                    ticks = custom.get("minecraft:play_time").getAsLong();
                } else if (custom.has("minecraft:play_one_minute")) {
                    ticks = custom.get("minecraft:play_one_minute").getAsLong();
                } else if (custom.has("minecraft:total_world_time")) {
                    ticks = custom.get("minecraft:total_world_time").getAsLong();
                }
            }
        }

        if (ticks <= 0) return 0.0;
        // 20 ticks = 1 sec, 1200 ticks = 1 min, 72000 ticks = 1 hour
        double hours = (double) ticks / 72000.0;
        return Math.round(hours * 10.0) / 10.0;
    }

    /**
     * Collects total blocks mined by the player across stats file and live session tracker.
     */
    public long getBlocksMined(OfflinePlayer player) {
        if (player == null) return 0L;
        UUID uuid = player.getUniqueId();

        long minedCount = 0L;

        // 1. Read historical blocks mined from world/stats/<uuid>.json
        JsonObject statsObj = readPlayerStatsJson(uuid);
        if (statsObj != null && statsObj.has("minecraft:mined")) {
            JsonObject mined = statsObj.getAsJsonObject("minecraft:mined");
            for (Map.Entry<String, JsonElement> entry : mined.entrySet()) {
                if (entry.getValue().isJsonPrimitive()) {
                    try {
                        minedCount += entry.getValue().getAsLong();
                    } catch (Exception ignored) {}
                }
            }
        }

        // 2. Add real-time blocks broken during the current running session
        minedCount += blockBreakTracker.getSessionBlocks(uuid);

        return minedCount;
    }

    private File getStatsDirectory() {
        List<World> worlds = Bukkit.getWorlds();
        if (worlds.isEmpty()) return null;
        World primaryWorld = worlds.get(0);
        return new File(primaryWorld.getWorldFolder(), "stats");
    }

    private JsonObject readPlayerStatsJson(UUID uuid) {
        File statsDir = getStatsDirectory();
        if (statsDir == null || !statsDir.isDirectory()) return null;

        File statsFile = new File(statsDir, uuid.toString() + ".json");
        if (!statsFile.exists() || !statsFile.canRead()) return null;

        try (FileReader reader = new FileReader(statsFile, StandardCharsets.UTF_8)) {
            JsonElement root = JsonParser.parseReader(reader);
            if (root.isJsonObject() && root.getAsJsonObject().has("stats")) {
                return root.getAsJsonObject().getAsJsonObject("stats");
            }
        } catch (Throwable ignored) {}

        return null;
    }
}
