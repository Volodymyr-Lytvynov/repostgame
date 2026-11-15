import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Digital Footprint",
  description: "Everything you post will age poorly. A browser party game of replies, leaked chats, excuses, and sabotage.",
};

export const viewport: Viewport = {
  themeColor: "#14110e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${sans.variable}`}>
      <body className="min-h-dvh bg-[#14110e] text-[#f6f1e8] antialiased">{children}</body>
    </html>
  );
}
