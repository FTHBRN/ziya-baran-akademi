/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['msedge-tts', 'ws', 'bufferutil'],
  },
};

module.exports = nextConfig;
