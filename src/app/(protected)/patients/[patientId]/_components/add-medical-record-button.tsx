"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import { MedicalRecordForm } from "./medical-record-form";

export function AddMedicalRecordButton({ patientId, doctors }: { patientId: string; doctors: { id: string; name: string; specialty: string }[] }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button disabled={!doctors.length}><PlusIcon className="mr-2 h-4 w-4" />Novo registro</Button></DialogTrigger>{open && <MedicalRecordForm patientId={patientId} doctors={doctors} onSuccess={() => setOpen(false)} />}</Dialog>;
}
