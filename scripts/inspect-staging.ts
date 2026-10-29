/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { PrismaClient } from "@prisma/client";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  if (fs.existsSync(".env.local")) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // ignore
    }
  } else if (fs.existsSync(".env")) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // ignore
    }
  }
}

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || rawUrl.trim() === "") {
    console.log(JSON.stringify({
      error: "DATABASE_URL is not configured in the environment.",
      configured: false,
    }, null, 2));
    process.exit(1);
  }

  // Parse endpoint safely without logging credentials
  let safeHost = "";
  let safeDbName = "";
  try {
    const parsed = new URL(rawUrl);
    safeHost = parsed.hostname;
    safeDbName = parsed.pathname.replace(/^\//, "");
  } catch {
    console.log(JSON.stringify({
      error: "DATABASE_URL is not a valid URL.",
      configured: false,
    }, null, 2));
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: rawUrl },
    },
  });

  try {
    // 1. Database and Session Identity
    const idRows = await prisma.$queryRawUnsafe<Array<{
      current_database: string;
      current_user: string;
      current_schema: string;
      version: string;
    }>>(`SELECT current_database(), current_user, current_schema(), version();`);

    // 2. Neon-specific settings
    let neonSettings: Record<string, string> = {};
    try {
      const neonRows = await prisma.$queryRawUnsafe<Array<{ name: string; setting: string }>>(
        `SELECT name, setting FROM pg_settings WHERE name LIKE '%neon%';`
      );
      for (const row of neonRows) {
        neonSettings[row.name] = row.setting;
      }
    } catch (e: any) {
      neonSettings = { error: e.message };
    }

    // Try neon branch settings directly
    let branchMetadata: Record<string, string | null> = {};
    try {
      const bRows = await prisma.$queryRawUnsafe<Array<{
        branch_name: string | null;
        branch_id: string | null;
        project_id: string | null;
        timeline_id: string | null;
      }>>(`
        SELECT 
          current_setting('neon.branch_name', true) as branch_name,
          current_setting('neon.branch_id', true) as branch_id,
          current_setting('neon.project_id', true) as project_id,
          current_setting('neon.timeline_id', true) as timeline_id;
      `);
      if (bRows.length > 0) {
        branchMetadata = bRows[0];
      }
    } catch (e: any) {
      branchMetadata = { error: e.message };
    }

    // 3. Tables in public schema
    const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    // 4. Columns for public tables
    const columns = await prisma.$queryRawUnsafe<Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>>(`
      SELECT table_name, column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);

    // 5. Constraints
    const constraints = await prisma.$queryRawUnsafe<Array<{
      conname: string;
      contype: string;
      table_name: string;
      def: string;
    }>>(`
      SELECT 
        c.conname, 
        c.contype, 
        c.conrelid::regclass::text as table_name, 
        pg_get_constraintdef(c.oid) as def 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE n.nspname = 'public' 
      ORDER BY table_name, c.conname;
    `);

    // 6. Indexes
    const indexes = await prisma.$queryRawUnsafe<Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);

    // 7. Prisma migration history
    let migrations: any[] = [];
    const hasMigrationsTable = tables.some(t => t.table_name === "_prisma_migrations");
    if (hasMigrationsTable) {
      migrations = await prisma.$queryRawUnsafe<Array<any>>(`
        SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count 
        FROM "_prisma_migrations" 
        ORDER BY started_at ASC;
      `);
    }

    // 8. Row counts (verify schema-only branch)
    const rowCounts: Record<string, number> = {};
    for (const t of tables) {
      // safe table name validation
      if (/^[a-zA-Z0-9_]+$/.test(t.table_name)) {
        try {
          const countRes = await prisma.$queryRawUnsafe<Array<{ count: string | number }>>(
            `SELECT count(*) as count FROM "${t.table_name}";`
          );
          rowCounts[t.table_name] = Number(countRes[0]?.count ?? 0);
        } catch (e: any) {
          rowCounts[t.table_name] = -1;
        }
      }
    }

    console.log(JSON.stringify({
      status: "SUCCESS",
      connection: {
        safeHost,
        safeDbName,
      },
      identity: idRows[0],
      neonSettings,
      branchMetadata,
      tableCount: tables.length,
      tables: tables.map(t => t.table_name),
      columns,
      constraints,
      indexes,
      hasMigrationsTable,
      migrations,
      rowCounts,
    }, null, 2));

  } catch (err: any) {
    console.error(JSON.stringify({
      status: "QUERY_FAILED",
      message: err.message,
    }, null, 2));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
