/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // This will disable static generation for pages that use client components
    // and prevent the "useState is not a function" error during build
    serverComponentsExternalPackages: ['next-auth'],
  },
};

module.exports = nextConfig; 