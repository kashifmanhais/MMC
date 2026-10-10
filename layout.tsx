import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata: Metadata = { title: { default: "MMC Redesign — Mirror Market Concept", template: "%s | MMC Redesign" }, description: "Structured trading education from MMC Redesign (Mirror Market Concept). Educational content only; not financial advice." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><SiteHeader />{children}<SiteFooter /></body></html>);
}
