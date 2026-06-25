declare module "next-pwa" {
  import { NextConfig } from "next";

  interface PWACacheEntry {
    urlPattern: RegExp;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
    };
  }

  interface PWAConfig {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean | string;
    runtimeCaching?: PWACacheEntry[];
    buildId?: string;
    publicPath?: string;
    swDest?: string;
    scope?: string;
    fallbackPath?: string;
    fallbacks?: Array<{
      shell: string;
      pages?: string[];
    }>;
    redirects?: Array<{
      source: string;
      destination: string;
    }>;
    navigateFallback?: string;
    navigateFallbackWhitelist?: string[];
    ignoreURLParametersMatching?: RegExp[];
    suppressWarnings?: boolean;
    workboxOptions?: Record<string, unknown>;
    exclude?: RegExp | RegExp[];
  }

  function withPWA(pwaConfig: PWAConfig): (config: NextConfig) => NextConfig;

  export default withPWA;
}