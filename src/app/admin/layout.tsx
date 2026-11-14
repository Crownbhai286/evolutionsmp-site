import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard » EvolutionSMP",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#080b1c] text-[#f4f6ff]">{children}</div>;
}
