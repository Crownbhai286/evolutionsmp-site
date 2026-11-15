import assert from "node:assert";
import crypto from "node:crypto";
import { z } from "zod";

console.log("=== Testing Leaderboard Sync API Schema & Logic ===\n");

const leaderboardPlayerSchema = z.object({
  category: z.enum(["money", "playtime", "blocksMined"]),
  rank_position: z.coerce.number().int().min(1).max(10000),
  username: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9_.*~-]+$/),
  uuid: z.string().trim().max(64).nullable().optional(),
  score: z.coerce.number().min(0),
  formatted_score: z.string().trim().max(80).optional(),
  guild: z.string().trim().max(50).nullable().optional(),
  tier: z.enum(["diamond", "gold", "silver", "bronze", "standard"]).default("standard"),
  playtime_label: z.string().trim().max(40).nullable().optional(),
  data_source: z.enum(["manual", "csv_import", "minecraft_api"]).default("manual"),
});

// Recreate syncPayloadSchema from route.ts
const syncPayloadSchema = z.object({
  statistics: z
    .object({
      total_registered_players: z.coerce.number().int().min(0).optional(),
      online_players: z.coerce.number().int().min(0).optional(),
      max_players: z.coerce.number().int().min(1).optional(),
      total_votes: z.coerce.number().int().min(0).optional(),
      java_online: z.boolean().optional(),
      bedrock_online: z.boolean().optional(),
    })
    .optional(),
  players: z.array(leaderboardPlayerSchema.omit({ data_source: true })).max(500).optional(),
});

// Test 1: Sample payload produced by EvolutionLeaderboard plugin
const validPluginPayload = {
  statistics: {
    total_registered_players: 184,
    online_players: 12,
    max_players: 100,
    java_online: true,
    bedrock_online: true,
  },
  players: [
    {
      category: "money",
      rank_position: 1,
      username: "CrownBhai",
      uuid: "3d776d7b-5840-4d9e-ad4e-c9cc6be27a62",
      score: 1250000.5,
      formatted_score: "$1,250,001",
      tier: "diamond",
      guild: "Evolution",
    },
    {
      category: "money",
      rank_position: 2,
      username: "Alex",
      uuid: "c3852899-7339-4467-bc5f-149b5c2a13ee",
      score: 850400,
      formatted_score: "$850,400",
      tier: "gold",
    },
    {
      category: "playtime",
      rank_position: 1,
      username: "CrownBhai",
      uuid: "3d776d7b-5840-4d9e-ad4e-c9cc6be27a62",
      score: 342.5,
      formatted_score: "343 hrs",
      playtime_label: "343 hrs",
      tier: "diamond",
    },
    {
      category: "blocksMined",
      rank_position: 1,
      username: "Steve",
      uuid: "a1852899-7339-4467-bc5f-149b5c2a13ee",
      score: 95420,
      formatted_score: "95,420 Blocks",
      tier: "diamond",
    },
  ],
};

const parseResult = syncPayloadSchema.safeParse(validPluginPayload);
assert.strictEqual(parseResult.success, true, "Valid payload failed parsing!");
console.log("✓ Test 1 Passed: Exact plugin payload parses cleanly through Zod validation.");

// Test 2: Invalid category rejection
const invalidCategoryPayload = {
  players: [
    {
      category: "kills", // invalid
      rank_position: 1,
      username: "Steve",
      score: 50,
    },
  ],
};
const invalidResult = syncPayloadSchema.safeParse(invalidCategoryPayload);
assert.strictEqual(invalidResult.success, false, "Invalid category was accepted!");
console.log("✓ Test 2 Passed: Invalid category ('kills') properly rejected by schema.");

// Test 3: API Key Verification Logic
function verifyApiKey(headerKey, expectedSecret) {
  if (!expectedSecret || expectedSecret.includes("replace-with") || !headerKey) return false;
  const a = Buffer.from(headerKey, "utf8");
  const b = Buffer.from(expectedSecret, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Case A: Missing header
assert.strictEqual(verifyApiKey(null, "my-super-secret-sync-key-123"), false);
// Case B: Incorrect header
assert.strictEqual(verifyApiKey("wrong-key", "my-super-secret-sync-key-123"), false);
// Case C: Unconfigured placeholder
assert.strictEqual(verifyApiKey("replace-with-long-random-secret-key", "replace-with-long-random-secret-key"), false);
// Case D: Matching valid secret
assert.strictEqual(verifyApiKey("my-super-secret-sync-key-123", "my-super-secret-sync-key-123"), true);
console.log("✓ Test 3 Passed: Constant-time API Key authentication verification passes all cases.");

console.log("\nAll schema and validation tests passed successfully!");
