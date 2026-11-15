package fun.evolutionsmp.leaderboard;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Logger;

/**
 * Orchestrates collecting data across CoinsEngine, Playtime, and Blocks Mined,
 * formatting payloads, and dispatching async HTTP requests to the website API.
 */
public final class LeaderboardSyncService {

    private final EvolutionLeaderboardPlugin plugin;
    private final Logger logger;
    private final CoinsEngineHook coinsEngineHook;
    private final StatsCollector statsCollector;
    private final ExecutorService executor;
    private final HttpClient httpClient;

    private volatile String lastSyncStatus = "Not yet synced";
    private volatile Instant lastSyncTime = null;
    private volatile int lastSyncedPlayerCount = 0;

    public LeaderboardSyncService(
            EvolutionLeaderboardPlugin plugin,
            CoinsEngineHook coinsEngineHook,
            StatsCollector statsCollector,
            ExecutorService executor
    ) {
        this.plugin = plugin;
        this.logger = plugin.getLogger();
        this.coinsEngineHook = coinsEngineHook;
        this.statsCollector = statsCollector;
        this.executor = executor;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(plugin.getConfig().getInt("api.timeout_seconds", 15)))
                .build();
    }

    /**
     * Executes the sync process asynchronously.
     */
    public CompletableFuture<Boolean> syncNow() {
        return CompletableFuture.supplyAsync(this::executeSyncInternal, executor);
    }

    private boolean executeSyncInternal() {
        String apiUrl = plugin.getConfig().getString("api.url", "https://evolutionsmp-site.vercel.app/api/sync/leaderboard").trim();
        String apiKey = plugin.getConfig().getString("api.sync_key", "").trim();
        int topLimit = Math.max(1, Math.min(500, plugin.getConfig().getInt("sync.top_players_per_category", 50)));
        boolean syncStats = plugin.getConfig().getBoolean("sync.sync_server_statistics", true);
        boolean debug = plugin.getConfig().getBoolean("logging.debug", false);

        if (apiKey.isEmpty() || apiKey.equalsIgnoreCase("PASTE_YOUR_MINECRAFT_SYNC_API_KEY_HERE")) {
            logger.warning("[EvolutionLeaderboard] Sync skipped: api.sync_key is not configured in config.yml. Set your MINECRAFT_SYNC_API_KEY.");
            lastSyncStatus = "Failed: Missing API Key";
            return false;
        }

        long startTime = System.currentTimeMillis();
        if (debug) {
            logger.info("[EvolutionLeaderboard] Collecting leaderboard statistics across players...");
        }

        Set<UUID> allPlayerUuids = statsCollector.getAllKnownPlayers();
        if (allPlayerUuids.isEmpty()) {
            logger.info("[EvolutionLeaderboard] No player data found on server yet. Sync skipped.");
            return true;
        }

        // Temporary structures to hold scores
        List<PlayerScore> moneyList = new ArrayList<>();
        List<PlayerScore> playtimeList = new ArrayList<>();
        List<PlayerScore> blocksList = new ArrayList<>();

        for (UUID uuid : allPlayerUuids) {
            OfflinePlayer op = Bukkit.getOfflinePlayer(uuid);
            String username = op.getName();
            if (username == null || username.trim().isEmpty()) {
                continue; // Cannot identify username
            }

            // Real CoinsEngine balance
            double money = coinsEngineHook.getBalance(op);
            if (money > 0) {
                moneyList.add(new PlayerScore(uuid, username, money));
            }

            // Real Playtime hours
            double playtime = statsCollector.getPlaytimeHours(op);
            if (playtime > 0) {
                playtimeList.add(new PlayerScore(uuid, username, playtime));
            }

            // Real Blocks Mined
            long blocks = statsCollector.getBlocksMined(op);
            if (blocks > 0) {
                blocksList.add(new PlayerScore(uuid, username, (double) blocks));
            }
        }

        // Sort descending
        moneyList.sort((a, b) -> Double.compare(b.score, a.score));
        playtimeList.sort((a, b) -> Double.compare(b.score, a.score));
        blocksList.sort((a, b) -> Double.compare(b.score, a.score));

        LeaderboardPayload.SyncRoot root = new LeaderboardPayload.SyncRoot();

        // Populate Server Statistics
        if (syncStats) {
            LeaderboardPayload.ServerStatistics stats = new LeaderboardPayload.ServerStatistics();
            stats.onlinePlayers = Bukkit.getOnlinePlayers().size();
            stats.maxPlayers = Bukkit.getMaxPlayers();
            stats.totalRegisteredPlayers = allPlayerUuids.size();
            stats.javaOnline = true;
            stats.bedrockOnline = Bukkit.getPluginManager().getPlugin("Geyser-Spigot") != null
                    || Bukkit.getPluginManager().getPlugin("floodgate") != null;
            root.statistics = stats;
        }

        NumberFormat formatter = NumberFormat.getInstance(Locale.US);

        // Populate Top Money
        int limitMoney = Math.min(topLimit, moneyList.size());
        for (int i = 0; i < limitMoney; i++) {
            PlayerScore ps = moneyList.get(i);
            int rank = i + 1;
            LeaderboardPayload.PlayerEntry entry = new LeaderboardPayload.PlayerEntry();
            entry.category = "money";
            entry.rankPosition = rank;
            entry.username = ps.username;
            entry.uuid = ps.uuid.toString();
            entry.score = Math.round(ps.score * 100.0) / 100.0;
            entry.formattedScore = "$" + formatter.format(Math.round(entry.score));
            entry.tier = resolveTier(rank);
            root.players.add(entry);
        }

        // Populate Top Playtime
        int limitPlaytime = Math.min(topLimit, playtimeList.size());
        for (int i = 0; i < limitPlaytime; i++) {
            PlayerScore ps = playtimeList.get(i);
            int rank = i + 1;
            LeaderboardPayload.PlayerEntry entry = new LeaderboardPayload.PlayerEntry();
            entry.category = "playtime";
            entry.rankPosition = rank;
            entry.username = ps.username;
            entry.uuid = ps.uuid.toString();
            entry.score = Math.round(ps.score * 10.0) / 10.0;
            String hrs = formatter.format(Math.round(entry.score)) + " hrs";
            entry.formattedScore = hrs;
            entry.playtimeLabel = hrs;
            entry.tier = resolveTier(rank);
            root.players.add(entry);
        }

        // Populate Top Blocks Mined
        int limitBlocks = Math.min(topLimit, blocksList.size());
        for (int i = 0; i < limitBlocks; i++) {
            PlayerScore ps = blocksList.get(i);
            int rank = i + 1;
            LeaderboardPayload.PlayerEntry entry = new LeaderboardPayload.PlayerEntry();
            entry.category = "blocksMined";
            entry.rankPosition = rank;
            entry.username = ps.username;
            entry.uuid = ps.uuid.toString();
            entry.score = Math.round(ps.score);
            entry.formattedScore = formatter.format((long) entry.score) + " Blocks";
            entry.tier = resolveTier(rank);
            root.players.add(entry);
        }

        String jsonPayload = LeaderboardPayload.toJson(root);

        if (debug) {
            logger.info("[EvolutionLeaderboard] Dispatching payload with " + root.players.size() + " leaderboard entries to: " + apiUrl);
        }

        // Send HTTP POST request asynchronously
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(plugin.getConfig().getInt("api.timeout_seconds", 15)))
                    .header("Content-Type", "application/json")
                    .header("x-sync-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int statusCode = response.statusCode();
            long elapsed = System.currentTimeMillis() - startTime;

            if (statusCode >= 200 && statusCode < 300) {
                lastSyncStatus = "Success (HTTP " + statusCode + ")";
                lastSyncTime = Instant.now();
                lastSyncedPlayerCount = root.players.size();
                logger.info("[EvolutionLeaderboard] Successfully synchronized " + root.players.size() + " leaderboard records in " + elapsed + "ms.");
                return true;
            } else if (statusCode == 401) {
                lastSyncStatus = "Error (401 Unauthorized)";
                logger.warning("[EvolutionLeaderboard] Sync rejected (HTTP 401): Invalid or unconfigured x-sync-api-key. Check MINECRAFT_SYNC_API_KEY in config.yml.");
                return false;
            } else if (statusCode == 429) {
                lastSyncStatus = "Rate Limited (HTTP 429)";
                logger.warning("[EvolutionLeaderboard] Sync endpoint rate limit exceeded (HTTP 429). Will retry on next scheduled interval.");
                return false;
            } else {
                lastSyncStatus = "Error (HTTP " + statusCode + ")";
                logger.warning("[EvolutionLeaderboard] Sync failed (HTTP " + statusCode + "): " + response.body());
                return false;
            }
        } catch (Exception ex) {
            lastSyncStatus = "Exception: " + ex.getMessage();
            logger.warning("[EvolutionLeaderboard] Failed to reach website sync endpoint: " + ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return false;
        }
    }

    private String resolveTier(int rank) {
        if (rank == 1) return "diamond";
        if (rank == 2) return "gold";
        if (rank == 3) return "silver";
        if (rank <= 10) return "bronze";
        return "standard";
    }

    public String getLastSyncStatus() {
        return lastSyncStatus;
    }

    public Instant getLastSyncTime() {
        return lastSyncTime;
    }

    public int getLastSyncedPlayerCount() {
        return lastSyncedPlayerCount;
    }

    private static class PlayerScore {
        final UUID uuid;
        final String username;
        final double score;

        PlayerScore(UUID uuid, String username, double score) {
            this.uuid = uuid;
            this.username = username;
            this.score = score;
        }
    }
}
