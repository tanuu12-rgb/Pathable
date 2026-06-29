import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://localhost:5432/placeholder",
  },
  out: "./drizzle",
});
