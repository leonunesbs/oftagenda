import path from 'path';

import type { NextConfig } from 'next';

import './src/lib/env/client';
import './src/lib/env/server';
import { redirects } from './redirects';

/**
 * CSPs that we're not adding (as it can change from project to project):
 * frame-src, connect-src, script-src, child-src, style-src, worker-src, font-src, media-src, and img-src
 */
const ContentSecurityPolicy = `
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'self' https://oftleonardo.com.br https://*.oftleonardo.com.br;
  manifest-src 'self';
  report-to default;
`;

// For more information, check https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer-when-downgrade',
  },
  {
    key: 'Permissions-Policy',
    value: `accelerometer=(), camera=(), gyroscope=(), microphone=(), usb=()`,
  },
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return redirects;
  },
  experimental: {
    // Enable caching for next build. FileSystem caching is enabled by default for development
    turbopackFileSystemCacheForBuild: true,
    // Inline CSS to reduce render-blocking stylesheet requests on first paint.
    inlineCss: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // next/dist/build/polyfills/polyfill-module.js ships polyfills for
      // Array.prototype.at, Object.hasOwn, String.prototype.trimStart/End, etc.
      // All are natively supported by our browserslist targets (Chrome 111+,
      // Safari 16.4+), so replace it with an empty module.
      const alias = config.resolve.alias as Record<string, string | false>;
      alias[
        path.resolve(
          'node_modules/next/dist/build/polyfills/polyfill-module.js',
        )
      ] = false;
    }
    return config;
  },
  reactStrictMode: true,
  reactCompiler: true,
};

export default nextConfig;
