import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [
    "@resvg/resvg-js",
    "@napi-rs/canvas",
    "@sparticuz/chromium-min",
    "puppeteer-core",
    "@remotion/bundler",
    "@remotion/renderer",
    "esbuild",
  ],
  // Vercel's Lambda runtime is glibc/x64 — exclude everything else that the
  // tracer would otherwise drag into every serverless function bundle.
  outputFileTracingExcludes: {
    "*": [
      // musl variants (Vercel uses glibc)
      "node_modules/@rspack/binding-linux-x64-musl/**",
      "node_modules/@rspack/binding-linux-arm64-musl/**",
      "node_modules/@swc/core-linux-x64-musl/**",
      "node_modules/@swc/core-linux-arm64-musl/**",
      "node_modules/@esbuild/linux-x64-musl/**",
      "node_modules/@esbuild/linux-arm64-musl/**",
      // non-linux platform binaries
      "node_modules/@rspack/binding-darwin-*/**",
      "node_modules/@rspack/binding-win32-*/**",
      "node_modules/@swc/core-darwin-*/**",
      "node_modules/@swc/core-win32-*/**",
      "node_modules/@esbuild/darwin-*/**",
      "node_modules/@esbuild/win32-*/**",
      "node_modules/@esbuild/freebsd-*/**",
      "node_modules/@esbuild/openbsd-*/**",
      "node_modules/@esbuild/netbsd-*/**",
      "node_modules/@esbuild/sunos-*/**",
      "node_modules/@esbuild/android-*/**",
      "node_modules/@esbuild/aix-*/**",
      // dev-only Remotion tooling never executed at runtime
      "node_modules/@remotion/studio/**",
      "node_modules/@remotion/cli/**",
      // user-generated MP4 outputs of the SSR render endpoint — not needed in
      // any function bundle, even if accidentally committed
      "public/rendered-videos/**",
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        canvas: false,
      },
      fallback: {
        ...config.resolve?.fallback,
        "@remotion/compositor": false,
        "@remotion/compositor-darwin-x64": false,
        "@remotion/compositor-darwin-arm64": false,
        "@remotion/compositor-linux-x64": false,
        "@remotion/compositor-linux-arm64": false,
        "@remotion/compositor-linux-x64-musl": false,
        "@remotion/compositor-linux-arm64-musl": false,
        "@remotion/compositor-linux-x64-gnu": false,
        "@remotion/compositor-linux-arm64-gnu": false,
        "@remotion/compositor-win32-x64": false,
        "@remotion/compositor-windows-x64": false,
        "@remotion/compositor-win32-x64-msvc": false,
        canvas: false,
        esbuild: false,
      },
    };

    if (isServer) {
      config.externals = [...(config.externals ?? []), "esbuild"];
    }

    return config;
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-color",
      "@tiptap/extension-highlight",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
      "@tiptap/extension-table",
      "recharts",
    ],
  },
};

export default withNextIntl(nextConfig);
