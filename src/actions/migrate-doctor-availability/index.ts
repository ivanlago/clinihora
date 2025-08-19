"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
// import { doctorsTable } from "@/db/schema";

export async function migrateDoctorAvailability() {
  try {
    // Verificar se as colunas antigas ainda existem
    const checkColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'doctors' 
      AND column_name IN (
        'available_from_week_day', 
        'available_to_week_day', 
        'available_from_time', 
        'available_to_time'
      );
    `);

    if (checkColumns.rows.length < 4) {
      throw new Error("As colunas antigas não existem mais no banco de dados");
    }

    // Buscar todos os médicos diretamente do banco com as colunas antigas
    const result = await db.execute(sql`
      SELECT 
        id, 
        available_from_week_day, 
        available_to_week_day, 
        available_from_time, 
        available_to_time 
      FROM doctors
    `);

  const doctors = result.rows as {
    id: string;
    available_from_week_day: number;
    available_to_week_day: number;
    available_from_time: string;
    available_to_time: string;
  }[];

  // Atualizar cada médico
  for (const doctor of doctors) {
    const fromDay = doctor.available_from_week_day;
    const toDay = doctor.available_to_week_day;
    const fromTime = doctor.available_from_time;
    const toTime = doctor.available_to_time;

    const availableDays = [];
    for (let day = fromDay; day <= toDay; day++) {
      availableDays.push({
        dayOfWeek: day,
        fromTime,
        toTime
      });
    }

      // Verificar se já não foi migrado
      const currentDoctor = await db.execute(sql`
        SELECT available_days 
        FROM doctors 
        WHERE id = ${doctor.id}
      `);

      const availableDaysArray = currentDoctor.rows[0]?.available_days as Array<{ dayOfWeek: number; fromTime: string; toTime: string }> | null;
      if (availableDaysArray && availableDaysArray.length > 0) {
        continue; // Pular se já tiver dias disponíveis configurados
      }

      // Atualizar o médico com os novos dados
      await db.execute(sql`
        UPDATE doctors 
        SET available_days = ${JSON.stringify(availableDays)}
        WHERE id = ${doctor.id}
      `);
    }
  } catch (error) {
    console.error("Erro durante a migração:", error);
    throw new Error(error instanceof Error ? error.message : "Erro desconhecido durante a migração");
  }
}
