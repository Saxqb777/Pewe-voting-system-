import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stamped once when the site is built, so the admin can see at a glance
  // which build is live rather than guessing whether an update landed.
  env: { BUILD_TIME: new Date().toISOString() },
  poweredByHeader: false,
  reactStrictMode: true,
  // The voter guide is a plain page served from our own site, so the link we
  // send carries the society's address and nothing else.
  async rewrites() {
    return [{ source: "/guide", destination: "/guide.html" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
