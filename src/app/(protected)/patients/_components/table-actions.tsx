import { MoreVerticalIcon } from "lucide-react";
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
  );
}
