import { and, desc, eq } from "drizzle-orm";
import { ArrowLeftIcon, CalendarIcon, StethoscopeIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { doctorsTable, medicalRecordsTable, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import { AddMedicalRecordButton } from "./_components/add-medical-record-button";

const labels = { consultation: "Consulta", anamnesis: "Anamnese", evolution: "Evolução", prescription: "Prescrição", exam: "Exame" } as const;

export default async function PatientRecordPage({ params }: { params: Promise<{ patientId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/authentication");
  if (!session.user.plan) redirect("/new-subscription");
  if (!session.user.clinic) redirect("/add-clinic");
  const { patientId } = await params;
  const clinicId = session.user.clinic.id;
  const patient = await db.query.patientsTable.findFirst({ where: and(eq(patientsTable.id, patientId), eq(patientsTable.clinicId, clinicId)) });
  if (!patient) notFound();
  const [records, doctors] = await Promise.all([
    db.query.medicalRecordsTable.findMany({ where: and(eq(medicalRecordsTable.patientId, patientId), eq(medicalRecordsTable.clinicId, clinicId)), with: { doctor: true }, orderBy: [desc(medicalRecordsTable.recordedAt)] }),
    db.query.doctorsTable.findMany({ where: eq(doctorsTable.clinicId, clinicId), columns: { id: true, name: true, specialty: true } }),
  ]);

  return <div className="flex flex-1 flex-col gap-6 p-6">
    <div><Button variant="ghost" asChild className="mb-3 -ml-3"><Link href="/patients"><ArrowLeftIcon className="mr-2 h-4 w-4" />Pacientes</Link></Button><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Prontuário de {patient.name}</h1><p className="text-muted-foreground">{patient.email} · {patient.phone}</p></div><AddMedicalRecordButton patientId={patient.id} doctors={doctors} /></div></div>
    {!doctors.length && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Cadastre um profissional antes de adicionar registros ao prontuário.</p>}
    <div className="space-y-4">
      {!records.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum registro clínico adicionado ainda.</CardContent></Card> : records.map((record) => <Card key={record.id}><CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><Badge variant="outline" className="mb-2">{labels[record.type]}</Badge><CardTitle className="text-lg">{record.title}</CardTitle></div><div className="text-muted-foreground flex items-center gap-1 text-sm"><CalendarIcon className="h-4 w-4" />{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(record.recordedAt)}</div></div></CardHeader><CardContent><p className="mb-4 whitespace-pre-wrap text-sm leading-6">{record.notes}</p><div className="text-muted-foreground flex items-center gap-2 border-t pt-3 text-sm"><StethoscopeIcon className="h-4 w-4" />{record.doctor.name} · {record.doctor.specialty}</div></CardContent></Card>)}
    </div>
  </div>;
}
