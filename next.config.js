import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite imports de módulos que usan Node.js nativo en API routes
    serverComponentsExternalPackages: ["googleapis", "google-auth-library"],
  },
  // Headers de seguridad para la app financiera
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
