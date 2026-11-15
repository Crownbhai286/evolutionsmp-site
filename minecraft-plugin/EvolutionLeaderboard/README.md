# EvolutionLeaderboard — Paper 1.21 Survival Server Plugin

A lightweight, high-performance Paper plugin for Minecraft 1.21.x that synchronizes **REAL** Survival server leaderboard data and live server statistics directly to the EvolutionSMP website via `POST /api/sync/leaderboard`.

---

## Features

1. **CoinsEngine Money Balances**:
   - Reads actual player currency balances from CoinsEngine (`CoinsEngineAPI`) for the configured currency (e.g. `money`).
   - Automatic fallback to **Vault Economy** (`net.milkbowl.vault.economy.Economy`) if CoinsEngine is registered through Vault.
2. **Actual Playtime Collection**:
   - Reads real player playtime from Paper statistics (`Statistic.PLAY_ONE_MINUTE`) and `world/stats/<uuid>.json` (`minecraft:play_time`).
   - Automatically converts game ticks to hours (`ticks / 72000.0`).
3. **Actual Blocks Mined Tracking**:
   - Parses `world/stats/<uuid>.json` (`minecraft:mined`) to calculate the exact, historical sum of all blocks broken by every player.
   - Includes a real-time `BlockBreakEvent` listener to capture live blocks broken during online gameplay.
4. **Exact JSON Schema**:
   - Formats categories: `money`, `playtime`, `blocksMined`.
   - Calculates ranking (1st, 2nd, 3rd, etc.) and tiers (`diamond`, `gold`, `silver`, `bronze`, `standard`).
   - Attaches player UUIDs and formatted score labels (`$1,250,000`, `142 hrs`, `45,120 Blocks`).
   - Transmits live server statistics: online player count, max players, total registered player count, and Java/Bedrock status.
5. **Zero Main Thread Lag**:
   - All collection, file parsing, JSON serialization, and HTTP network requests execute asynchronously using Java 21's `HttpClient` on a dedicated worker thread (`EvoLeaderboard-Worker`).
6. **Automatic 15-Minute Sync**:
   - Automatically synchronizes data every 15 minutes (configurable in `config.yml`).
   - Initial boot delay (30 seconds) ensures other plugins (CoinsEngine, Vault, world managers) load completely first.
7. **No Fake / Sample Players**:
   - Only processes real player UUIDs with active gameplay records from the server.
8. **Secure Secret Handling**:
   - The synchronization key is stored exclusively in `plugins/EvolutionLeaderboard/config.yml` on the game server.

---

## Installation

1. Copy the compiled JAR file:
   ```
   minecraft-plugin/EvolutionLeaderboard/dist/EvolutionLeaderboard-1.0.0.jar
   ```
   into your Paper server's `plugins/` directory.
2. Start or restart your Minecraft server to generate `plugins/EvolutionLeaderboard/config.yml`.
3. Open `plugins/EvolutionLeaderboard/config.yml` and configure your API key:
   ```yaml
   api:
     url: "https://evolutionsmp-site.vercel.app/api/sync/leaderboard"
     sync_key: "YOUR_MINECRAFT_SYNC_API_KEY_HERE"
   ```
   *(Ensure `sync_key` matches the `MINECRAFT_SYNC_API_KEY` defined in the website's `.env.local` / Vercel environment variables).*
4. Run `/evosync reload` or restart the server.
5. Verify the connection by running `/evosync now` from console or in-game.

---

## In-Game Commands

| Command | Permission | Description |
|---|---|---|
| `/evosync now` | `evolutionsmp.admin` | Triggers an immediate asynchronous leaderboard sync |
| `/evosync status` | `evolutionsmp.admin` | Displays the last sync timestamp, status code, and record count |
| `/evosync reload` | `evolutionsmp.admin` | Reloads `config.yml` and restarts the 15-minute sync timer |
| `/evosync help` | `evolutionsmp.admin` | Displays the command guide |

*Default permission for `evolutionsmp.admin` is OP.*

---

## Configuration (`config.yml`)

```yaml
api:
  # Destination endpoint on the website
  url: "https://evolutionsmp-site.vercel.app/api/sync/leaderboard"

  # Secret key matching MINECRAFT_SYNC_API_KEY
  sync_key: "YOUR_MINECRAFT_SYNC_API_KEY_HERE"

  # Connection timeout in seconds
  timeout_seconds: 15

sync:
  # Synchronization interval in minutes (default: 15)
  interval_minutes: 15

  # Delay before first sync after boot (seconds)
  initial_delay_seconds: 30

  # Max top players to send per category (1-500)
  top_players_per_category: 50

  # Sync online player count, max players, total players
  sync_server_statistics: true

coins_engine:
  # CoinsEngine currency ID to track for Top Money
  currency_id: "money"

logging:
  # Verbose debug logging in console
  debug: false
```

---

## Building from Source

### Using PowerShell (Instant):
```powershell
powershell -ExecutionPolicy Bypass -File ./minecraft-plugin/EvolutionLeaderboard/build.ps1
```

### Using Gradle:
```bash
cd minecraft-plugin/EvolutionLeaderboard
gradle build
```
Output: `build/libs/EvolutionLeaderboard-1.0.0.jar`

### Using Maven:
```bash
cd minecraft-plugin/EvolutionLeaderboard
mvn clean package
```
Output: `target/EvolutionLeaderboard-1.0.0.jar`
