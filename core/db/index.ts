// kesy/core/db/index.ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isVercel = process.env.VERCEL === "1";

// 1. Turso Cloud Database
const remoteUrl = process.env.TURSO_DATABASE_URL;
const remoteAuthToken = process.env.TURSO_AUTH_TOKEN;

const remoteClient = remoteUrl
  ? createClient({ url: remoteUrl, authToken: remoteAuthToken })
  : null;

export const dbRemote = remoteClient ? drizzle(remoteClient, { schema }) : null;

// 2. Lokale SQLite Database
const localUrl = process.env.DATABASE_URL;

const localClient = !isVercel && localUrl
  ? createClient({ url: localUrl })
  : !isVercel
  ? createClient({ url: "file:local.db" })
  : null;

// Op Vercel of als localClient afwezig is, valt dbLocal terug op dbRemote
const rawLocal = isVercel
  ? dbRemote
  : localClient
  ? drizzle(localClient, { schema })
  : dbRemote;

// Type assertion: dbLocal is minimaal gelijk aan dbRemote of local DB
export const dbLocal = rawLocal!;

export const isCloudOnly = isVercel || !localUrl;