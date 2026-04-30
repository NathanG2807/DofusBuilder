import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dofusdu.de",
        pathname: "/dofus3/**",
      },
      {
        protocol: "https",
        hostname: "static.ankama.com",
      },
      {
        protocol: "https",
        hostname: "www.dofus.com",
      },
    ],
  },
};

export default nextConfig;
