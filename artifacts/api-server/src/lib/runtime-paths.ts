import path from "node:path";
import { fileURLToPath } from "node:url";

/** Dossier du bundle (dist/index.mjs) ou du fichier source en test. */
const here = path.dirname(fileURLToPath(import.meta.url));

function fromEnv(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

/** Photos /uploads. Défaut local : artifacts/api-server/uploads */
export function uploadsDir(): string {
  return fromEnv("UPLOADS_DIR", path.join(here, "../uploads"));
}

/** Site construit. Défaut local : artifacts/qdia-export/dist/public */
export function webRootDir(): string {
  return fromEnv("WEB_ROOT", path.join(here, "../../qdia-export/dist/public"));
}

/** Fichiers data (tarifs). Défaut local : artifacts/api-server/data */
export function dataDir(): string {
  return fromEnv("DATA_DIR", path.join(here, "../data"));
}

/** Fichier .env. Défaut : racine du monorepo. */
export function envFilePath(): string {
  return fromEnv("ENV_FILE", path.resolve(here, "../../../.env"));
}
