import React from "react";
import NewsClient from "@/components/NewsClient";
import { getPublishedNews } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const posts = await getPublishedNews();
  return <NewsClient posts={posts} />;
}
