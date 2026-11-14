import React from "react";
import RulesClient from "@/components/RulesClient";
import { getPublicRules, getWebsiteSettings } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const [sections, settings] = await Promise.all([
    getPublicRules(),
    getWebsiteSettings(),
  ]);
  return <RulesClient sections={sections} discordTicketUrl={settings.discordTicketUrl} />;
}
