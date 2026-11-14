import React from "react";
import StaffClient from "@/components/StaffClient";
import { getPublicStaffMembers, getWebsiteSettings } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const [members, settings] = await Promise.all([
    getPublicStaffMembers(),
    getWebsiteSettings(),
  ]);
  return <StaffClient members={members} discordInviteUrl={settings.discordInviteUrl} />;
}
