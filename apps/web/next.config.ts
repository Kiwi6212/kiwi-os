import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /portfolio used to host the dev-activity module. It has been
      // renamed to /dev-activity so we can reuse /portfolio for a real
      // public portfolio later. Use 302 (permanent: false) — a 301 would
      // be cached by browsers and break the future /portfolio route.
      {
        source: "/portfolio",
        destination: "/dev-activity",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
