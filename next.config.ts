import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@resvg/resvg-js",
    "@sparticuz/chromium-min",
    "puppeteer-core",
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/lambda",
    "esbuild",
  ],
  webpack: (config, { isServer }) => {
    config.resolve = {
      ...config.resolve,
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
