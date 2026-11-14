#!/usr/bin/env node
/**
 * Programmatic Supabase Seed & Initial Owner Admin Script
 * Usage:
 *   npm run db:seed
 *   SEED_OWNER_EMAIL="owner@evolutionsmp.fun" SEED_OWNER_PASSWORD="YourStrongPassword!" npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  for (const envName of [".env.local", ".env"]) {
    const file = path.join(process.cwd(), envName);
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnvLocal();

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
if (rawUrl) {
  try {
    const p = new URL(rawUrl);
    rawUrl = `${p.protocol}//${p.host}`;
  } catch {}
}
const url = rawUrl;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

if (!url || !serviceKey || url.includes("your-project-ref")) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureOwnerAdmin() {
  const rawEmail = process.env.SEED_OWNER_EMAIL?.trim();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD?.trim();
  if (!rawEmail || !ownerPassword) {
    console.log(
      "Skipping owner admin creation (pass SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD to create initial Owner account)."
    );
    return;
  }

  const ownerEmail = rawEmail.toLowerCase();
  if (!ownerEmail.includes("@") || ownerEmail.length < 5) {
    throw new Error(`Invalid email address provided: ${ownerEmail}`);
  }

  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list Supabase Auth users:", listErr.message);
    throw listErr;
  }

  let user = usersData.users.find((u) => u.email?.toLowerCase() === ownerEmail);
  if (!user) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    if (createErr) {
      console.error(`Failed to create Supabase Auth user for ${ownerEmail}:`, createErr.message);
      throw createErr;
    }
    user = created.user;
    console.log(`Created Supabase Auth user for owner: ${ownerEmail}`);
  } else {
    // If the Auth user already exists, update their password & confirm email
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: ownerPassword,
      email_confirm: true,
    });
    if (updateErr) {
      console.error(`Failed to update password for Auth user ${ownerEmail}:`, updateErr.message);
      throw updateErr;
    }
    user = updated.user;
    console.log(`Updated password and confirmed email for existing Auth user: ${ownerEmail}`);
  }

  // Ensure matching admin_users record has correct email, role: 'owner', and is_active: true
  const { data: existingByUserId } = await supabase
    .from("admin_users")
    .select("id, user_id, email, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: existingByEmail } = await supabase
    .from("admin_users")
    .select("id, user_id, email, role, is_active")
    .eq("email", ownerEmail)
    .maybeSingle();

  if (existingByUserId) {
    const { error: updateAdminErr } = await supabase
      .from("admin_users")
      .update({
        email: ownerEmail,
        role: "owner",
        is_active: true,
      })
      .eq("id", existingByUserId.id);

    if (updateAdminErr) {
      console.error("Failed to update admin_users record:", updateAdminErr.message);
      throw updateAdminErr;
    }
    console.log(`Updated existing admin_users record for ${ownerEmail} (role: owner, is_active: true)`);
  } else if (existingByEmail) {
    const { error: updateAdminErr } = await supabase
      .from("admin_users")
      .update({
        user_id: user.id,
        role: "owner",
        is_active: true,
      })
      .eq("id", existingByEmail.id);

    if (updateAdminErr) {
      console.error("Failed to link admin_users record to Auth user:", updateAdminErr.message);
      throw updateAdminErr;
    }
    console.log(`Linked existing admin_users record to Auth user (role: owner, is_active: true) for ${ownerEmail}`);
  } else {
    const { error: insertErr } = await supabase.from("admin_users").insert({
      user_id: user.id,
      email: ownerEmail,
      display_name: "Owner",
      role: "owner",
      is_active: true,
    });

    if (insertErr) {
      console.error("Failed to insert admin_users record:", insertErr.message);
      throw insertErr;
    }
    console.log(`Created new active 'owner' record in admin_users for ${ownerEmail}`);
  }
}

async function main() {
  const { error: testErr } = await supabase.from("website_settings").select("key").limit(1);
  if (testErr) {
    console.error(
      "Database schema not initialized yet. Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor first."
    );
    console.error(testErr.message);
    process.exit(1);
  }

  await ensureOwnerAdmin();
  console.log("Database connection verified. Apply supabase/seed.sql if tables are empty.");
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
