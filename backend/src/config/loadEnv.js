import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const BACKEND_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const envPath = path.join(BACKEND_ROOT, ".env");
const result = config({ path: envPath });

if (result.error?.code === "ENOENT" && !process.env.MONGODB_URI) {
  throw new Error(
    `Backend environment file not found at ${envPath}. Copy .env.example to .env and set MONGODB_URI and JWT_SECRET.`
  );
}

if (result.error && result.error.code !== "ENOENT") {
  throw result.error;
}
