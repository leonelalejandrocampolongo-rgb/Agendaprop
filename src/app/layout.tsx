import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getDb } from "@/lib/db";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgendaProp | Reservá tu turno",
  description: "Reservá turnos de masajes, faciales y estética online.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const db = await getDb();

  return (
    <html
      lang="es"
      data-theme={db.settings.colorTheme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-cocoa">
        {children}
      </body>
    </html>
  );
}
