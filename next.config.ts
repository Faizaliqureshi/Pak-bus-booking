import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Playwright / local tools that hit 127.0.0.1 while Next binds to localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
