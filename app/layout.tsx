import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "W8R — How can we serve you better?",
  description: "One marketplace for physical, digital and NFT products, powered by AUD-first OfPay crypto payments.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "W8R — How can we serve you better?",
    description: "Everything you value. One place to find it.",
    images: [{ url: "/og-card.svg", width: 1200, height: 630, alt: "W8R · How can we serve you better?" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-card.svg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>;
}
