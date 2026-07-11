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
import { DataTable } from "@/components/ui/data-table";
import { db } from "@/db";
import { proceduresTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import { AddProcedureButton } from "./_components/add-procedure-button";
import { proceduresTableColumns } from "./_components/table-columns";

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
  });

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
          <AddProcedureButton />
        </PageActions>
      </PageHeader>
      <PageContent>
        <DataTable columns={proceduresTableColumns} data={procedures} />
      </PageContent>
    </PageContainer>
  );
}
