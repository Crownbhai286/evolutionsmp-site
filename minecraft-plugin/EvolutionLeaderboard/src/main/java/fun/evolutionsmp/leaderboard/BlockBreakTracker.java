package fun.evolutionsmp.leaderboard;

import org.bukkit.GameMode;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks real-time blocks mined by online players to complement offline stats files.
 */
public final class BlockBreakTracker implements Listener {

    private final Map<UUID, Long> sessionBlockBreaks = new ConcurrentHashMap<>();

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBlockBreak(BlockBreakEvent event) {
        Player player = event.getPlayer();
        if (player.getGameMode() == GameMode.CREATIVE || player.getGameMode() == GameMode.SPECTATOR) {
            return;
        }

        UUID uuid = player.getUniqueId();
        sessionBlockBreaks.merge(uuid, 1L, Long::sum);
    }

    public long getSessionBlocks(UUID uuid) {
        return sessionBlockBreaks.getOrDefault(uuid, 0L);
    }

    public void clear() {
        sessionBlockBreaks.clear();
    }
}
