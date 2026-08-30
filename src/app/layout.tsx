import type { Metadata, Viewport } from "next";
import "./globals.css";
import { strings } from "@/lib/strings";
import { config } from "@/lib/config";

const description = `${strings.common.orgName}. ${strings.common.registration}.`;

export const metadata: Metadata = {
  ...(config.siteUrl ? { metadataBase: new URL(config.siteUrl) } : {}),
  title: strings.common.appName,
  description,
  robots: { index: false, follow: false },
  icons: { icon: "/psws-logo.jpg", apple: "/psws-logo.jpg" },
  // WhatsApp reads these when someone shares the voting link, so the society
  // seal and the election name show under the link instead of a bare address.
  openGraph: {
    type: "website",
    url: "/",
    siteName: strings.common.orgName,
    title: strings.common.appName,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: strings.common.appName }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#14603c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
