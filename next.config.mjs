/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable experimental features to improve stability
  experimental: {
    optimizePackageImports: false,
  },
  // Add some wiggle room for memory usage
  experimental: {
    memoryBasedTurbopack: false,
  },
};

export default nextConfig;
