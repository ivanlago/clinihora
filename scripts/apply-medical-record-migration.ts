import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function tableExists(tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    "select to_regclass($1) is not null as exists",
    [`public.${tableName}`]
  );
  return result.rows[0]?.exists ?? false;
}

async function applyFile(fileName: string) {
  const sql = await readFile(path.join(process.cwd(), "drizzle", fileName), "utf8");
  await client.query(sql.replaceAll("--> statement-breakpoint", ""));
}

async function columnExists(tableName: string, columnName: string) {
  const result = await client.query<{ exists: boolean }>(
    "select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2) as exists",
    [tableName, columnName]
  );
  return result.rows[0]?.exists ?? false;
}

async function main() {
  await client.connect();
  try {
    await client.query("begin");

    if (!(await tableExists("procedures"))) {
      await applyFile("0004_jittery_mentor.sql");
    }

    if (!(await tableExists("medical_records"))) {
      await applyFile("0005_fancy_cerebro.sql");
    }

    if (!(await columnExists("appointments", "type"))) {
      await applyFile("0006_sad_doctor_doom.sql");
    }

    if (!(await tableExists("procedures_to_doctors"))) {
      await applyFile("0007_glamorous_nightshade.sql");
    }

    await client.query("commit");

    const result = await client.query<{ procedures: boolean; medical_records: boolean; appointment_type: boolean; procedure_professionals: boolean; appointment_doctor_optional: boolean }>(
      "select to_regclass('public.procedures') is not null as procedures, to_regclass('public.medical_records') is not null as medical_records, exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'type') as appointment_type, to_regclass('public.procedures_to_doctors') is not null as procedure_professionals, exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'appointments' and column_name = 'doctor_id' and is_nullable = 'YES') as appointment_doctor_optional"
    );
    console.log(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main();
