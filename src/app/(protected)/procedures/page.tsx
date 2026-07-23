import { eq } from "drizzle-orm";
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
import { db } from "@/db";
import { doctorsTable, proceduresTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import { AddProcedureButton } from "./_components/add-procedure-button";
import { ProceduresTable } from "./_components/procedures-table";

export default async function ProceduresPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/authentication");
  }

  if (!session?.user?.plan) {
    redirect("/new-subscription");
  }

  if (!session?.user?.clinic) {
    redirect("/add-clinic");
  }

  const procedures = await db.query.proceduresTable.findMany({
    where: eq(proceduresTable.clinicId, session.user.clinic.id),
    orderBy: (procedures, { asc }) => [asc(procedures.name)],
    with: { proceduresToDoctors: true },
  });
  const doctors = await db.query.doctorsTable.findMany({
    where: eq(doctorsTable.clinicId, session.user.clinic.id),
    orderBy: (doctors, { asc }) => [asc(doctors.name)],
  });
  const procedureRows = procedures.map((procedure) => ({
    ...procedure,
    doctorIds: procedure.proceduresToDoctors.map((item) => item.doctorId),
  }));

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Procedimentos</PageTitle>
          <PageDescription>
            Gerencie os procedimentos oferecidos pela sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <AddProcedureButton doctors={doctors} />
        </PageActions>
      </PageHeader>
      <PageContent>
        <ProceduresTable procedures={procedureRows} doctors={doctors} />
      </PageContent>
    </PageContainer>
  );
}
