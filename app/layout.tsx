import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DataLogic PREMIUM - Sistema de Gestión",
  description: "Sistema integral de gestión empresarial",
};

export const viewport: Viewport = {
  themeColor: "#4f8ef7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={dmSans.className}>{children}</body>
    </html>
  );
}
