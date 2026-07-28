import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 1. Lokale SQLite Database (alleen beschikbaar / gebruikt op PC)
const localClient = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
});

// Zorg dat SQLite FK checks uitschakelt op de verbinding
localClient.execute("PRAGMA foreign_keys = OFF;");

export const dbLocal = drizzle(localClient, { schema });

// 2. Turso Cloud Database (beschikbaar op PC én Vercel)
const remoteUrl = process.env.TURSO_DATABASE_URL;
const remoteAuthToken = process.env.TURSO_AUTH_TOKEN;

const remoteClient = remoteUrl
  ? createClient({ url: remoteUrl, authToken: remoteAuthToken })
  : null;

export const dbRemote = remoteClient ? drizzle(remoteClient, { schema }) : null;

// Hulp-identificatie: Draaien we op Vercel of lokaal op de PC?
export const isCloudOnly = process.env.VERCEL === "1" || !process.env.DATABASE_URL;