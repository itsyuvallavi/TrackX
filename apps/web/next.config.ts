// Owner: apps/web. Next.js configuration for the TrackX dashboard.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trackx/shared"],
};

export default nextConfig;
