/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Permite imports de módulos que usan Node.js nativo en API routes
    serverComponentsExternalPackages: ["googleapis", "google-auth-library"],
  },
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

module.exports = nextConfig;
