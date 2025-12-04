import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set Turbopack root to this project to avoid multi-lockfile inference issues
  // (helps local dev when other package-lock.json files exist on the machine)
  turbopack: {
    // __dirname resolves to the directory of this config file (the frontend folder)
    root: __dirname,
  },
  // All API routes are now handled by app/api/* route handlers
  // which properly forward auth tokens to the backend
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: 'http://localhost:8000/health',
      },
    ];
  },
};

export default nextConfig;
