import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// neon() never connects eagerly, so a placeholder keeps builds working
// when DATABASE_URL is absent; queries fail at request time instead.
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set; database queries will fail.");
}

const sql = neon(
  process.env.DATABASE_URL ??
    "postgresql://placeholder:placeholder@placeholder.invalid/placeholder"
);

export const db = drizzle(sql, { schema });
