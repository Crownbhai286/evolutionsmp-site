package fun.evolutionsmp.leaderboard;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.RegisteredServiceProvider;

import java.lang.reflect.Method;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Handles CoinsEngine balance extraction with automatic Vault Economy fallback.
 */
public final class CoinsEngineHook {

    private final Logger logger;
    private final String configuredCurrency;

    // CoinsEngine reflection cache
    private boolean coinsEngineAvailable = false;
    private Object cachedCurrencyObj = null;
    private Method getBalanceByCurrencyMethod = null;
    private Method getBalanceByStringMethod = null;

    // Vault Economy cache
    private Object vaultEconomyProvider = null;
    private Method vaultGetBalanceMethod = null;

    public CoinsEngineHook(Logger logger, String configuredCurrency) {
        this.logger = logger;
        this.configuredCurrency = (configuredCurrency == null || configuredCurrency.trim().isEmpty())
                ? "money"
                : configuredCurrency.trim();
        setup();
    }

    private void setup() {
        setupCoinsEngine();
        setupVault();

        if (coinsEngineAvailable) {
            logger.info("[CoinsEngineHook] CoinsEngine integration active for currency: " + configuredCurrency);
        } else if (vaultEconomyProvider != null) {
            logger.info("[CoinsEngineHook] CoinsEngine direct API not found; Vault Economy fallback is active.");
        } else {
            logger.warning("[CoinsEngineHook] Neither CoinsEngine nor Vault Economy found. Money scores will report as 0.0 until enabled.");
        }
    }

    private void setupCoinsEngine() {
        Plugin plugin = Bukkit.getPluginManager().getPlugin("CoinsEngine");
        if (plugin == null || !plugin.isEnabled()) {
            return;
        }

        try {
            Class<?> apiClass = Class.forName("su.nightexpress.coinsengine.api.CoinsEngineAPI");

            // Look for getCurrency(String)
            try {
                Method getCurrencyMethod = apiClass.getMethod("getCurrency", String.class);
                cachedCurrencyObj = getCurrencyMethod.invoke(null, configuredCurrency);
            } catch (Exception ignored) {}

            // Look for getBalance(UUID, Currency)
            if (cachedCurrencyObj != null) {
                for (Method m : apiClass.getMethods()) {
                    if (m.getName().equals("getBalance") && m.getParameterCount() == 2) {
                        Class<?>[] params = m.getParameterTypes();
                        if (params[0].equals(UUID.class) && params[1].isInstance(cachedCurrencyObj)) {
                            getBalanceByCurrencyMethod = m;
                            break;
                        }
                    }
                }
            }

            // Look for getBalance(UUID, String)
            for (Method m : apiClass.getMethods()) {
                if (m.getName().equals("getBalance") && m.getParameterCount() == 2) {
                    Class<?>[] params = m.getParameterTypes();
                    if (params[0].equals(UUID.class) && params[1].equals(String.class)) {
                        getBalanceByStringMethod = m;
                        break;
                    }
                }
            }

            if (getBalanceByCurrencyMethod != null || getBalanceByStringMethod != null) {
                coinsEngineAvailable = true;
            }
        } catch (Throwable t) {
            logger.warning("[CoinsEngineHook] Could not initialize native CoinsEngine API: " + t.getMessage());
        }
    }

    private void setupVault() {
        if (Bukkit.getPluginManager().getPlugin("Vault") == null) {
            return;
        }

        try {
            Class<?> economyClass = Class.forName("net.milkbowl.vault.economy.Economy");
            RegisteredServiceProvider<?> rsp = Bukkit.getServicesManager().getRegistration(economyClass);
            if (rsp != null) {
                vaultEconomyProvider = rsp.getProvider();
                // Find getBalance(OfflinePlayer) or getBalance(String)
                try {
                    vaultGetBalanceMethod = economyClass.getMethod("getBalance", OfflinePlayer.class);
                } catch (NoSuchMethodException e) {
                    vaultGetBalanceMethod = economyClass.getMethod("getBalance", String.class);
                }
            }
        } catch (Throwable t) {
            logger.warning("[CoinsEngineHook] Vault lookup skipped: " + t.getMessage());
        }
    }

    /**
     * Resolves the player's currency balance.
     */
    public double getBalance(OfflinePlayer player) {
        if (player == null) return 0.0;
        UUID uuid = player.getUniqueId();

        // 1. Try CoinsEngine direct API
        if (coinsEngineAvailable) {
            try {
                if (getBalanceByCurrencyMethod != null && cachedCurrencyObj != null) {
                    Object res = getBalanceByCurrencyMethod.invoke(null, uuid, cachedCurrencyObj);
                    if (res instanceof Number num) return num.doubleValue();
                }
                if (getBalanceByStringMethod != null) {
                    Object res = getBalanceByStringMethod.invoke(null, uuid, configuredCurrency);
                    if (res instanceof Number num) return num.doubleValue();
                }
            } catch (Throwable ignored) {}
        }

        // 2. Try Vault Economy fallback
        if (vaultEconomyProvider != null && vaultGetBalanceMethod != null) {
            try {
                Object param = vaultGetBalanceMethod.getParameterTypes()[0].equals(OfflinePlayer.class)
                        ? player
                        : player.getName();
                if (param != null) {
                    Object res = vaultGetBalanceMethod.invoke(vaultEconomyProvider, param);
                    if (res instanceof Number num) return num.doubleValue();
                }
            } catch (Throwable ignored) {}
        }

        return 0.0;
    }

    public boolean isCoinsEngineAvailable() {
        return coinsEngineAvailable;
    }

    public boolean isVaultAvailable() {
        return vaultEconomyProvider != null;
    }
}
