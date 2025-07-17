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
    // Use older CSS processing approach
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      ?.oneOf;
    
    if (rules) {
      // Find the PostCSS loader rule
      const postcssLoader = rules.find(
        (rule) => rule.use && rule.use.loader === 'next-postcss-loader'
      );
      
      if (postcssLoader) {
        // Use the stable PostCSS configuration
        postcssLoader.use.options = {
          ...postcssLoader.use.options,
          postcssOptions: {
            plugins: [
              require('tailwindcss'),
              require('autoprefixer'),
            ],
          },
        };
      }
    }
    
    // Modify the resolve paths to include node_modules
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'), 
      'node_modules', 
      ...config.resolve.modules || []
    ];
    
    return config;
  },
  experimental: {
    // Disable experimental features that could cause issues
    optimizePackageImports: false,
  },
};

export default nextConfig;
