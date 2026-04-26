import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataLogic · Panel Financiero",
  description: "Sistema de análisis financiero empresarial",
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
