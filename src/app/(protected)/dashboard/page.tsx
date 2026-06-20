import dayjs from "dayjs";
import { desc, eq } from "drizzle-orm";
import { Calendar } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getDashboard } from "@/data/get-dashboard";
import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import AppointmentsChart from "./_components/appointments-chart";
import { DatePicker } from "./_components/date-picker";
import StatsCards from "./_components/stats-card";
import { todayAppointmentsColumns } from "./_components/today-appointments-columns";
import TopDoctors from "./_components/top-doctors";
import TopSpecialties from "./_components/top-specialties";

interface DashboardPageProps {
  searchParams: Promise<{
    from: string;
    to: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { from, to } = await searchParams;

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

  if (!from || !to) {
    const latestAppointment = await db.query.appointmentsTable.findFirst({
      where: eq(appointmentsTable.clinicId, session.user.clinic.id),
      orderBy: desc(appointmentsTable.date),
      columns: {
        date: true,
      },
    });

    const latestAppointmentMonthEnd = latestAppointment?.date
      ? dayjs(latestAppointment.date).endOf("month")
      : dayjs().endOf("month");
    const today = dayjs();
    const endDate = latestAppointmentMonthEnd.isBefore(today, "day")
      ? today.endOf("month")
      : latestAppointmentMonthEnd;

    redirect(
      `/dashboard?from=${today.format("YYYY-MM-DD")}&to=${endDate.format("YYYY-MM-DD")}`
    );
  }

  const {
    totalRevenue,
    totalAppointments,
    totalPatients,
    totalDoctors,
    topDoctors,
    topSpecialties,
    todayAppointments,
    dailyAppointmentsData,
  } = await getDashboard({
    from,
    to,
    session: {
      user: {
        clinic: {
          id: session.user.clinic.id,
        },
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>
            Tenha uma visão geral da sua clínica
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <DatePicker />
        </PageActions>
      </PageHeader>
      <PageContent>
        <StatsCards
          totalRevenue={totalRevenue.total ? Number(totalRevenue.total) : null}
          totalAppointments={totalAppointments.total}
          totalPatients={totalPatients.total}
          totalDoctors={totalDoctors.total}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2.25fr_1fr]">
          <div className="flex flex-col gap-4">
            <AppointmentsChart dailyAppointmentsData={dailyAppointmentsData} />
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className="text-muted-foreground" />
                  <CardTitle className="text-base">
                    Agendamentos de hoje
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <DataTable
                  columns={todayAppointmentsColumns}
                  data={todayAppointments}
                />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <TopDoctors doctors={topDoctors} />
            <TopSpecialties topSpecialties={topSpecialties} />
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
