import { eq, like, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-container";
import { DataTable } from "@/components/ui/data-table";
import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import { AddPatientButton } from "./_components/add-patient-button";
// import { PatientCard } from "./_components/patient-card";
import { PatientFilters } from "./_components/patient-filters";
import { patientsTableColumns } from "./_components/table-columns";

interface PatientsPageProps {
  searchParams: Promise<{ search?: string; sex?: "male" | "female" | "all" }>;
}

export default async function PatientsPage({
  searchParams,
}: PatientsPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/authentication");
  }

  if (!session?.user?.clinic) {
    redirect("/add-clinic");
  }

  // Await searchParams before using them
  const { search, sex } = await searchParams;

  // Base condition that's always present
  const baseCondition = eq(patientsTable.clinicId, session.user.clinic.id);

  // Additional conditions
  const searchCondition = search
    ? or(
        like(sql`lower(${patientsTable.name})`, `%${search.toLowerCase()}%`),
        like(sql`lower(${patientsTable.email})`, `%${search.toLowerCase()}%`)
      )
    : null;

  const sexCondition = sex && sex !== "all" ? eq(patientsTable.sex, sex) : null;

  // Combine conditions
  const whereCondition = [baseCondition, searchCondition, sexCondition]
    .filter(
      (condition): condition is NonNullable<typeof condition> =>
        condition !== null
    )
    .reduce((acc, condition) => sql`${acc} and ${condition}`);

  const patients = await db.query.patientsTable.findMany({
    where: whereCondition,
  });

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Pacientes</PageTitle>
          <PageDescription>
            Gerencie os pacientes da sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddPatientButton />
        </PageActions>
      </PageHeader>
      <PageContent>
        <div className="space-y-4">
          <PatientFilters />
          <DataTable columns={patientsTableColumns} data={patients} />
        </div>
      </PageContent>
    </PageContainer>
  );
}
