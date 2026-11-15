import React from "react";
import StoreClient from "@/components/StoreClient";
import { getPublicStoreData, getWebsiteSettings } from "@/lib/services/public-data";
import { getTebexConfigStatus } from "@/lib/tebex";
import { getFamGatewayConfigStatus } from "@/lib/famgateway";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const [storeData, settings] = await Promise.all([
    getPublicStoreData(),
    getWebsiteSettings(),
  ]);
  const tebexStatus = getTebexConfigStatus();
  const famStatus = getFamGatewayConfigStatus();

  return (
    <StoreClient
      products={storeData.products}
      categories={storeData.categories}
      coinConfig={storeData.coinConfig}
      settings={settings}
      tebexConfigured={tebexStatus.hasPublicToken}
      famgatewayConfigured={famStatus.configured}
      usdToInrRate={famStatus.usdToInrRate}
    />
  );
}
