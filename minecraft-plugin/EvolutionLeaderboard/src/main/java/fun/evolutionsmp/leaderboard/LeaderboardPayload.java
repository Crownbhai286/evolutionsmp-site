package fun.evolutionsmp.leaderboard;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.annotations.SerializedName;

import java.util.ArrayList;
import java.util.List;

/**
 * Data transfer objects matching the exact JSON schema of POST /api/sync/leaderboard.
 */
public final class LeaderboardPayload {

    private static final Gson GSON = new GsonBuilder().create();

    public static class ServerStatistics {
        @SerializedName("total_registered_players")
        public Integer totalRegisteredPlayers;

        @SerializedName("online_players")
        public Integer onlinePlayers;

        @SerializedName("max_players")
        public Integer maxPlayers;

        @SerializedName("total_votes")
        public Integer totalVotes;

        @SerializedName("java_online")
        public Boolean javaOnline = true;

        @SerializedName("bedrock_online")
        public Boolean bedrockOnline = true;
    }

    public static class PlayerEntry {
        @SerializedName("category")
        public String category; // "money" | "playtime" | "blocksMined"

        @SerializedName("rank_position")
        public int rankPosition;

        @SerializedName("username")
        public String username;

        @SerializedName("uuid")
        public String uuid;

        @SerializedName("score")
        public double score;

        @SerializedName("formatted_score")
        public String formattedScore;

        @SerializedName("guild")
        public String guild;

        @SerializedName("tier")
        public String tier; // "diamond" | "gold" | "silver" | "bronze" | "standard"

        @SerializedName("playtime_label")
        public String playtimeLabel;
    }

    public static class SyncRoot {
        @SerializedName("statistics")
        public ServerStatistics statistics;

        @SerializedName("players")
        public List<PlayerEntry> players = new ArrayList<>();
    }

    public static String toJson(SyncRoot root) {
        return GSON.toJson(root);
    }
}
