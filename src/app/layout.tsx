import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DashboardNav from "@/components/DashboardNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "X Analytics · tegu-growth",
  description: "Dashboard de analytics del building-in-public de Tegu — lee Brand/Content, sin API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <DashboardNav />
        <main className="max-w-[1080px] px-6 py-9 md:ml-[220px] md:px-10">{children}</main>
      </body>
    </html>
  );
}
