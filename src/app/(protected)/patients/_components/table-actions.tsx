import { FileTextIcon, MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { patientsTable } from "@/db/schema";

import { PatientForm } from "./patient-form";

interface PatientTableActionsProps {
  patient: typeof patientsTable.$inferSelect;
}

export default function PatientTableActions({
  patient,
}: PatientTableActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" asChild title="Abrir prontuário">
        <Link href={`/patients/${patient.id}`}>
          <FileTextIcon className="h-4 w-4" />
        </Link>
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      {isDialogOpen && (
        <PatientForm
          key={`patient-form-${patient.id}-${isDialogOpen}`}
          defaultValues={patient}
          onSuccess={() => setIsDialogOpen(false)}
        />
      )}
      </Dialog>
    </div>
  );
}
