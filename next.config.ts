import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Build errors are NOT ignored — fix them instead of hiding them. */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
  // Required for NextAuth.js on a custom domain or hosting platform
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

export default nextConfig;
