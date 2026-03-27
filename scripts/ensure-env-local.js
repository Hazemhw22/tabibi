/* eslint-disable no-console */
/**
 * predev hook: ensure `.env.local` exists for local dev.
 * - If it exists: do nothing.
 * - If missing: create a minimal placeholder file (so next dev can start).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function main() {
  try {
    if (fs.existsSync(ENV_LOCAL)) {
      return;
    }

    const content = [
      "# Local env (created automatically)",
      "# Fill these values before starting the app.",
      "NEXT_PUBLIC_SUPABASE_URL=",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=",
      "AUTH_SECRET=",
      "",
    ].join("\n");

    fs.writeFileSync(ENV_LOCAL, content, { encoding: "utf8", flag: "wx" });
    console.log("Created .env.local (empty placeholders).");
  } catch (err) {
    console.warn("ensure-env-local: failed to create .env.local");
    console.warn(err);
  }
}

main();

