/**
 * Wrapper around fetch that redirects to sign-in on 401 responses.
 */
export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
  });
  if (res.status === 401) {
    const locale = window.location.pathname.split("/")[1] || "de";
    window.location.href = `/${locale}/auth/sign-in`;
    throw new Error("Unauthorized");
  }
  return res;
}
