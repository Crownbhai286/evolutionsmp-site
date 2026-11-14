import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { ToastProvider } from "@/components/NotificationToast";
import { SERVER_CONFIG } from "@/lib/data";
import { getHomepageSections, getWebsiteSettings } from "@/lib/services/public-data";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0a0d22",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SERVER_CONFIG.domain}`),
  title: `${SERVER_CONFIG.name} » The Next Generation Minecraft Survival Network`,
  description: `The premier Minecraft Survival network for Java & Bedrock. You can't imagine what's coming next. Connect to ${SERVER_CONFIG.javaIp}`,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/logo.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
    ],
  },
  keywords: [
    "Minecraft Server",
    "EvolutionSMP",
    "Survival SMP",
    "Minecraft Economy",
    "Land Claims SMP",
    "Minecraft Crossplay",
    "Bedrock Server",
  ],
  authors: [{ name: "EvolutionSMP Team" }],
  openGraph: {
    title: `${SERVER_CONFIG.name} » Season 4`,
    description: `You can't imagine what's coming next. Join with ${SERVER_CONFIG.javaIp}`,
    url: `https://${SERVER_CONFIG.domain}`,
    siteName: SERVER_CONFIG.name,
    images: [
      {
        url: "/logo.png",
        width: 824,
        height: 817,
        alt: "EvolutionSMP Official Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${SERVER_CONFIG.name} » Season 4`,
    description: `You can't imagine what's coming next. Join with ${SERVER_CONFIG.javaIp}`,
    images: ["/logo.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, sections] = await Promise.all([
    getWebsiteSettings(),
    getHomepageSections(),
  ]);
  const footerSection = sections.find((s) => s.sectionKey === "footer");

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {/* Google Fonts: Lilita One (Headings) & Inter (Body) to match Playbex typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Lilita+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="home min-h-screen bg-[#0a0d22] text-[#f4f6ff] antialiased relative selection:bg-[#ff7a1f]/30 selection:text-white">
        <ToastProvider>
          <SiteChrome settings={settings} footerSection={footerSection}>
            {children}
          </SiteChrome>
        </ToastProvider>
      </body>
    </html>
  );
}
