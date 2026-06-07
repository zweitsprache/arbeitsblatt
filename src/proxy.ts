import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000";

export default function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") || "";

  // Strip port for comparison
  const hostWithoutPort = hostname.split(":")[0];
  const baseWithoutPort = BASE_DOMAIN.split(":")[0];
  const isLocalBaseDomain =
    baseWithoutPort === "localhost" || baseWithoutPort === "127.0.0.1";

  // If the path is not already under a locale, prefix with default
  const pathParts = req.nextUrl.pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  const hasLocale = pathParts.length > 0 && locales.includes(pathParts[0]);
  const locale = hasLocale ? pathParts[0] : routing.defaultLocale;
  const restPath = hasLocale ? "/" + pathParts.slice(1).join("/") : req.nextUrl.pathname;

  // Check for library subdomain pattern first (e.g., library.lingostar.ch)
  const isLibrarySubdomain = hostWithoutPort.startsWith("library.");
  if (isLibrarySubdomain && !isLocalBaseDomain) {
    // Extract brand slug from library.{brand}.{tld}
    // e.g., library.lingostar.ch → lingostar
    const parts = hostWithoutPort.split(".");
    if (parts.length >= 2) {
      const brandSlug = parts[1]; // library -> lingostar -> ch
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/library/${brandSlug}${restPath === "/" ? "" : restPath}`;
      return NextResponse.rewrite(url);
    }
  }

  // Detect subdomain on main domain (e.g., something.app.arbeitsblatt.ch)
  let subdomain: string | null = null;
  if (
    hostWithoutPort !== baseWithoutPort &&
    hostWithoutPort.endsWith(`.${baseWithoutPort}`)
  ) {
    subdomain = hostWithoutPort.replace(`.${baseWithoutPort}`, "");
  }

  // If subdomain detected (and not www), inject client slug header
  // and rewrite to project-viewer routes
  const RESERVED_SUBDOMAINS = ["www"];
  // Local development should not rewrite based on subdomain heuristics.
  // This avoids local-only 404s when opening non-standard localhost hosts.
  if (!isLocalBaseDomain && subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-client-slug", subdomain);

    const url = req.nextUrl.clone();

    // Rewrite to project-viewer route group
    url.pathname = `/${locale}/project-viewer${restPath === "/" ? "" : restPath}`;

    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  // Default: i18n proxy for the main app
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