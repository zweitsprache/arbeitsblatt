import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "@sparticuz/chromium"],
};

export default withNextIntl(nextConfig);
