import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Vercel injects VERCEL_GIT_COMMIT_SHA (unprefixed) into the build environment on
    // every deploy regardless of the dashboard's "Automatically expose System
    // Environment Variables" toggle -- that toggle only controls whether Vercel also
    // creates NEXT_PUBLIC_-prefixed duplicates, which we don't want to depend on.
    // Reading it here at build time and re-exposing it under our own NEXT_PUBLIC_ name
    // bakes it into the client bundle unconditionally. Falls back to a local build
    // timestamp/sha outside Vercel (e.g. `next build` on a laptop).
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
