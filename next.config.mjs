// For compatibility with Render deployment
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure PostCSS can find its dependencies
  webpack: (config, { isServer }) => {
    // Modify the resolve paths to include node_modules
    config.resolve.modules = [path.resolve(__dirname, 'node_modules'), 'node_modules', ...config.resolve.modules];
    return config;
  },
  experimental: {
    // Reduce memory usage during build
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
