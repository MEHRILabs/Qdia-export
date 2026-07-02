import { unlinkSync, existsSync } from "node:fs";

for (const lock of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(lock)) unlinkSync(lock);
}

const agent = process.env.npm_config_user_agent ?? "";
if (!agent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
