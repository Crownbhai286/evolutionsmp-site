import { spawn } from "node:child_process";
import http from "node:http";

const PORT = 3009;
const TEST_KEY = "test-secret-sync-key-evo-2026";

console.log("Starting Next.js test server on port " + PORT + "...");

const env = {
  ...process.env,
  PORT: String(PORT),
  MINECRAFT_SYNC_API_KEY: TEST_KEY,
};

const server = spawn("node", ["./node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (d) => {
  const line = d.toString();
  if (line.includes("Ready in") || line.includes("started server on")) {
    console.log("Server ready!");
    runTests();
  }
});

server.stderr.on("data", (d) => {
  // console.error(d.toString());
});

let testTimeout = setTimeout(() => {
  console.error("Server start timed out.");
  server.kill();
  process.exit(1);
}, 30000);

async function runTests() {
  clearTimeout(testTimeout);
  try {
    const baseUrl = `http://127.0.0.1:${PORT}/api/sync/leaderboard`;

    // 1. Missing Key
    console.log("\n1. Testing Missing API Key...");
    let res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    console.log("Status:", res.status, res.status === 401 ? "✓ 401 (Expected)" : "✗ Unexpected");
    let body = await res.json();
    console.log("Response:", body);

    // 2. Wrong Key
    console.log("\n2. Testing Wrong API Key...");
    res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-api-key": "invalid-key" },
      body: JSON.stringify({}),
    });
    console.log("Status:", res.status, res.status === 401 ? "✓ 401 (Expected)" : "✗ Unexpected");

    // 3. Valid Key with Actual Leaderboard Payload
    console.log("\n3. Testing Valid Key with Actual Leaderboard Payload...");
    const payload = {
      statistics: {
        total_registered_players: 250,
        online_players: 15,
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
          score: 1500000.0,
          formatted_score: "$1,500,000",
          tier: "diamond",
          guild: "Evolution",
        },
        {
          category: "playtime",
          rank_position: 1,
          username: "CrownBhai",
          uuid: "3d776d7b-5840-4d9e-ad4e-c9cc6be27a62",
          score: 180.5,
          formatted_score: "181 hrs",
          playtime_label: "181 hrs",
          tier: "diamond",
        },
        {
          category: "blocksMined",
          rank_position: 1,
          username: "CrownBhai",
          uuid: "3d776d7b-5840-4d9e-ad4e-c9cc6be27a62",
          score: 42100,
          formatted_score: "42,100 Blocks",
          tier: "diamond",
        },
      ],
    };

    res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-api-key": TEST_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log("Status:", res.status);
    body = await res.json();
    console.log("Response:", body);

    if (res.ok) {
      console.log("\n✓ SUCCESS: Leaderboard payload accepted and processed successfully!");
    } else {
      console.log("\nNote: Server response code:", res.status, body);
    }
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.kill();
    process.exit(0);
  }
}
