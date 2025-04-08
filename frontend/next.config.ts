import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/api/descriptions/:id',
        destination: '/api/descriptions/[descriptionId]',
        permanent: false,
      },
    ];
  }
};

export default nextConfig;
