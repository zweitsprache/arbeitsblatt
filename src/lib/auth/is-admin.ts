/**
 * Admin check based on NEXT_PUBLIC_ADMIN_USER_IDS environment variable.
 * Comma-separated list of user IDs that are considered admins.
 */

const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/** Check if a user ID belongs to an admin */
export function isAdmin(userId: string): boolean {
  return ADMIN_IDS.includes(userId);
}
