"use client";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

import DoctorForm from "./doctor-form";

export default function AddDoctorButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Novo médico
        </Button>
      </DialogTrigger>
      <DoctorForm onSuccess={() => setIsOpen(false)} />
    </Dialog>
  );
}
