import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIM — Store Inventory Management",
  description:
    "Aplikasi manajemen stok harian multi-site untuk pencatatan transaksi, valuasi persediaan, dan pelaporan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
