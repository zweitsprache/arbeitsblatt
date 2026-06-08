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
  // Build uses `next build --webpack`, so @rspack and @swc/core are
  // build-time only and not needed in any function.
  outputFileTracingExcludes: {
    "*": [
      // @rspack — not used; build runs with webpack
      "node_modules/@rspack/**",
      // @swc/core platform binaries — build-time transform, not used at runtime
      "node_modules/@swc/core-linux-*/**",
      "node_modules/@swc/core-darwin-*/**",
      "node_modules/@swc/core-win32-*/**",
      "node_modules/@swc/core-freebsd-*/**",
      // esbuild — already in serverExternalPackages; drop non-glibc/non-x64
      // variants we'll never load on Vercel's Lambda runtime
      "node_modules/@esbuild/linux-x64-musl/**",
      "node_modules/@esbuild/linux-arm64-musl/**",
      "node_modules/@esbuild/linux-arm64/**",
      "node_modules/@esbuild/linux-arm/**",
      "node_modules/@esbuild/linux-ia32/**",
      "node_modules/@esbuild/linux-ppc64/**",
      "node_modules/@esbuild/linux-s390x/**",
      "node_modules/@esbuild/linux-mips64el/**",
      "node_modules/@esbuild/linux-riscv64/**",
      "node_modules/@esbuild/linux-loong64/**",
      "node_modules/@esbuild/darwin-*/**",
      "node_modules/@esbuild/win32-*/**",
      "node_modules/@esbuild/freebsd-*/**",
      "node_modules/@esbuild/openbsd-*/**",
      "node_modules/@esbuild/netbsd-*/**",
      "node_modules/@esbuild/sunos-*/**",
      "node_modules/@esbuild/android-*/**",
      "node_modules/@esbuild/aix-*/**",
      // Build-time only
      "node_modules/typescript/**",
      "node_modules/terser/**",
      // Dev-only Remotion tooling never executed at runtime
      "node_modules/@remotion/studio/**",
      "node_modules/@remotion/cli/**",
      // User-generated MP4 outputs of the SSR render endpoint
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
