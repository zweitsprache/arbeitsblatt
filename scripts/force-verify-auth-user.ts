/**
 * Force-verify an email in the Neon Auth database.
 *
 * Usage:
 *   AUTH_DATABASE_URL=postgres://...  pnpm tsx scripts/force-verify-auth-user.ts <email>
 *
 * AUTH_DATABASE_URL must point at the Neon Auth Postgres endpoint
 * (Neon Console -> Auth -> Configuration -> Connection string).
 * It is a separate database from the app's DATABASE_URL.
 */
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: tsx scripts/force-verify-auth-user.ts <email>");
    process.exit(1);
  }

  const connectionString =
    process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Neither AUTH_DATABASE_URL nor DATABASE_URL is set in .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const before = await pool.query(
      `SELECT id, email, "emailVerified", "updatedAt"
         FROM neon_auth."user"
        WHERE lower(email) = lower($1)`,
      [email],
    );

    if (before.rowCount === 0) {
      console.error(`No user found in neon_auth."user" for email: ${email}`);
      process.exit(2);
    }

    console.log("Before:");
    console.table(before.rows);

    const updated = await pool.query(
      `UPDATE neon_auth."user"
          SET "emailVerified" = true,
              "updatedAt" = NOW()
        WHERE lower(email) = lower($1)
        RETURNING id, email, "emailVerified", "updatedAt"`,
      [email],
    );

    console.log("After:");
    console.table(updated.rows);
    console.log(`✓ Verified ${updated.rowCount} user(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
