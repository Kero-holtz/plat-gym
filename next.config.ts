import type { NextConfig } from "next"

if (process.env.VERCEL === "1") {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DATABASE_URL"]
  const missing = required.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(`Missing required Vercel environment variables: ${missing.join(", ")}`)
  }
  if (process.env.PLAT_GYM_TEST_MODE === "true") {
    throw new Error("PLAT_GYM_TEST_MODE must never be enabled on Vercel.")
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["better-sqlite3", "pg"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

export default nextConfig
