import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";

export default function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";

  // Strip port for comparison
  const hostWithoutPort = hostname.split(":")[0];
  const baseWithoutPort = BASE_DOMAIN.split(":")[0];

  // Detect subdomain: everything before the base domain
  let subdomain: string | null = null;
  if (
    hostWithoutPort !== baseWithoutPort &&
    hostWithoutPort.endsWith(`.${baseWithoutPort}`)
  ) {
    subdomain = hostWithoutPort.replace(`.${baseWithoutPort}`, "");
  }

  // If subdomain detected (and not www), inject project slug header
  // and rewrite to the project viewer routes
  const RESERVED_SUBDOMAINS = ["www"];
  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-project-slug", subdomain);

    const url = req.nextUrl.clone();

    // If the path is not already under a locale, prefix with default
    const pathParts = url.pathname.split("/").filter(Boolean);
    const locales = routing.locales as readonly string[];
    const hasLocale = pathParts.length > 0 && locales.includes(pathParts[0]);
    const locale = hasLocale ? pathParts[0] : routing.defaultLocale;
    const restPath = hasLocale
      ? "/" + pathParts.slice(1).join("/")
      : url.pathname;

    // Rewrite to project-viewer route group
    url.pathname = `/${locale}/project-viewer${restPath === "/" ? "" : restPath}`;

    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  // Default: i18n middleware for the main app
  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except API routes, static files, etc.
  matcher: [
    "/",
    "/(de|en)/:path*",
    "/((?!api|_next|_vercel|logo|.*\\..*).*)",
  ],
};
