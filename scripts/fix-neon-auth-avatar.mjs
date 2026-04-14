import { cp, access, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "@radix-ui", "react-avatar");
const target = path.join(
  root,
  "node_modules",
  "@neondatabase",
  "auth",
  "node_modules",
  "@radix-ui",
  "react-avatar"
);

async function ensureNeonAvatarPath() {
  try {
    await access(path.join(target, "dist", "index.mjs"));
    return;
  } catch {
    // Missing nested avatar package; copy it from the top-level install.
  }

  try {
    await access(path.join(source, "dist", "index.mjs"));
  } catch {
    console.warn("[fix-neon-auth-avatar] Source package not found; skipping");
    return;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, force: true });
  console.log("[fix-neon-auth-avatar] Restored nested @radix-ui/react-avatar for @neondatabase/auth");
}

ensureNeonAvatarPath().catch((error) => {
  console.warn("[fix-neon-auth-avatar] Failed:", error.message);
});
