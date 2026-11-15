import type { Metadata, Viewport } from "next";
import { Grand_Hotel, Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const script = Grand_Hotel({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Кривой репост",
  description: "Вечеринка в браузере: пишешь нормальную фразу, друг вставляет её в чужой интерфейс, комната выбирает, кому стыднее.",
};

export const viewport: Viewport = {
  themeColor: "#14110e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`dark ${sans.variable} ${script.variable}`}>
      <body className="min-h-dvh bg-[#14110e] text-[#f6f1e8] antialiased">{children}</body>
    </html>
  );
}
