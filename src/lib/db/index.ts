import "server-only"

import { Kysely, PostgresDialect, SqliteDialect } from "kysely"
import { Pool } from "pg"
import { openLocalDatabase } from "@/lib/db/local"
import type { DatabaseSchema } from "@/lib/db/types"

declare global {
  var __platGymDb: Kysely<DatabaseSchema> | undefined
}

export function isPostgresMode(): boolean {
  return Boolean(process.env.DATABASE_URL?.startsWith("postgres"))
}

function createDatabase(): Kysely<DatabaseSchema> {
  if (isPostgresMode()) {
    return new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
          max: Number(process.env.DB_POOL_SIZE ?? 5),
          ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
        }),
      }),
    })
  }

  if (process.env.VERCEL === "1" && process.env.PLAT_GYM_TEST_MODE !== "true") {
    throw new Error("DATABASE_URL is required on Vercel. SQLite is available only for local development and automated tests.")
  }

  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: openLocalDatabase() }),
  })
}

export function getDb(): Kysely<DatabaseSchema> {
  if (!globalThis.__platGymDb) globalThis.__platGymDb = createDatabase()
  return globalThis.__platGymDb
}

export function timestampToIso(value: string | Date | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}
