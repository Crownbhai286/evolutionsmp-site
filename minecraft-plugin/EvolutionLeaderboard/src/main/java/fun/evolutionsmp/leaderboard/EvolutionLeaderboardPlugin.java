package fun.evolutionsmp.leaderboard;

import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * EvolutionSMP Survival Leaderboard Sync Plugin for Minecraft Paper 1.21.x.
 * Periodically exports real CoinsEngine money, Playtime, and Blocks Mined
 * to the website endpoint POST /api/sync/leaderboard.
 */
public final class EvolutionLeaderboardPlugin extends JavaPlugin {

    private ExecutorService workerExecutor;
    private BlockBreakTracker blockBreakTracker;
    private CoinsEngineHook coinsEngineHook;
    private StatsCollector statsCollector;
    private LeaderboardSyncService syncService;
    private BukkitTask syncTask;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        workerExecutor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "EvoLeaderboard-Worker");
            t.setDaemon(true);
            return t;
        });

        // 1. Live block break tracker
        blockBreakTracker = new BlockBreakTracker();
        getServer().getPluginManager().registerEvents(blockBreakTracker, this);

        // 2. CoinsEngine & Vault Hook
        String currencyId = getConfig().getString("coins_engine.currency_id", "money");
        coinsEngineHook = new CoinsEngineHook(getLogger(), currencyId);

        // 3. Stats Collector
        statsCollector = new StatsCollector(getLogger(), blockBreakTracker);

        // 4. Sync Service
        syncService = new LeaderboardSyncService(this, coinsEngineHook, statsCollector, workerExecutor);

        // 5. Schedule 15-minute recurring async sync
        startSyncSchedule();

        getLogger().info("=================================================");
        getLogger().info(" EvolutionLeaderboard Plugin v" + getDescription().getVersion() + " Enabled");
        getLogger().info(" Target: " + getConfig().getString("api.url"));
        getLogger().info(" Sync Interval: " + getConfig().getInt("sync.interval_minutes", 15) + " minutes");
        getLogger().info(" CoinsEngine: " + (coinsEngineHook.isCoinsEngineAvailable() ? "Active" : (coinsEngineHook.isVaultAvailable() ? "Active (Vault Fallback)" : "Not Found")));
        getLogger().info(" Type /evosync help for available commands.");
        getLogger().info("=================================================");
    }

    @Override
    public void onDisable() {
        if (syncTask != null) {
            syncTask.cancel();
            syncTask = null;
        }

        if (workerExecutor != null) {
            workerExecutor.shutdownNow();
            workerExecutor = null;
        }

        if (blockBreakTracker != null) {
            blockBreakTracker.clear();
        }

        getLogger().info("EvolutionLeaderboard disabled.");
    }

    private void startSyncSchedule() {
        if (syncTask != null) {
            syncTask.cancel();
        }

        int intervalMinutes = Math.max(1, getConfig().getInt("sync.interval_minutes", 15));
        int initialDelaySeconds = Math.max(5, getConfig().getInt("sync.initial_delay_seconds", 30));

        long intervalTicks = (long) intervalMinutes * 60L * 20L;
        long delayTicks = (long) initialDelaySeconds * 20L;

        syncTask = getServer().getScheduler().runTaskTimerAsynchronously(
                this,
                () -> syncService.syncNow(),
                delayTicks,
                intervalTicks
        );
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("evolutionsmp.admin")) {
            sender.sendMessage(ChatColor.RED + "You do not have permission to use this command.");
            return true;
        }

        if (args.length == 0 || args[0].equalsIgnoreCase("help")) {
            sender.sendMessage(ChatColor.GOLD + "=== EvolutionLeaderboard Commands ===");
            sender.sendMessage(ChatColor.YELLOW + "/evosync now" + ChatColor.WHITE + " - Trigger immediate leaderboard synchronization");
            sender.sendMessage(ChatColor.YELLOW + "/evosync status" + ChatColor.WHITE + " - View last sync status, timestamp and count");
            sender.sendMessage(ChatColor.YELLOW + "/evosync reload" + ChatColor.WHITE + " - Reload config.yml settings");
            sender.sendMessage(ChatColor.YELLOW + "/evosync help" + ChatColor.WHITE + " - Show this help message");
            return true;
        }

        switch (args[0].toLowerCase(Locale.ROOT)) {
            case "now":
                sender.sendMessage(ChatColor.YELLOW + "[EvolutionLeaderboard] Starting immediate asynchronous sync...");
                syncService.syncNow().thenAccept(success -> {
                    if (success) {
                        sender.sendMessage(ChatColor.GREEN + "[EvolutionLeaderboard] Sync completed successfully! (" + syncService.getLastSyncedPlayerCount() + " records)");
                    } else {
                        sender.sendMessage(ChatColor.RED + "[EvolutionLeaderboard] Sync failed! Status: " + syncService.getLastSyncStatus());
                    }
                });
                break;

            case "status":
                sender.sendMessage(ChatColor.GOLD + "=== EvolutionLeaderboard Status ===");
                sender.sendMessage(ChatColor.YELLOW + "API URL: " + ChatColor.WHITE + getConfig().getString("api.url"));
                sender.sendMessage(ChatColor.YELLOW + "Sync Interval: " + ChatColor.WHITE + getConfig().getInt("sync.interval_minutes", 15) + " min");
                sender.sendMessage(ChatColor.YELLOW + "Last Status: " + ChatColor.WHITE + syncService.getLastSyncStatus());
                if (syncService.getLastSyncTime() != null) {
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z").withZone(ZoneId.systemDefault());
                    sender.sendMessage(ChatColor.YELLOW + "Last Synced At: " + ChatColor.WHITE + fmt.format(syncService.getLastSyncTime()));
                    sender.sendMessage(ChatColor.YELLOW + "Last Synced Records: " + ChatColor.WHITE + syncService.getLastSyncedPlayerCount());
                }
                sender.sendMessage(ChatColor.YELLOW + "CoinsEngine Status: " + ChatColor.WHITE + (coinsEngineHook.isCoinsEngineAvailable() ? "Active (CoinsEngine)" : (coinsEngineHook.isVaultAvailable() ? "Active (Vault)" : "Missing")));
                break;

            case "reload":
                reloadConfig();
                startSyncSchedule();
                sender.sendMessage(ChatColor.GREEN + "[EvolutionLeaderboard] Configuration reloaded successfully.");
                break;

            default:
                sender.sendMessage(ChatColor.RED + "Unknown command. Use /evosync help");
                break;
        }

        return true;
    }
}
