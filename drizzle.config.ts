// // kesy/drizzle.config.sys
// import { defineConfig } from "drizzle-kit";

// export default defineConfig({
//   schema: "./**/db/schema.ts",
//   out: "./drizzle",
//   dialect: "sqlite",
//   dbCredentials: {
//     url: process.env.DATABASE_URL || "file:local.db",
//   },
// });

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Laad handmatig .env.local in voor drizzle-kit
dotenv.config({ path: ".env.local" });

const isTurso = Boolean(process.env.TURSO_DATABASE_URL);

export default defineConfig({
  schema: "./**/db/schema.ts",
  out: "./drizzle",
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});