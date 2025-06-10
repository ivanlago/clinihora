"use client";

import { MailIcon, PhoneIcon } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { patientsTable } from "@/db/schema";

import { PatientForm } from "./patient-form";

interface PatientCardProps {
  patient: typeof patientsTable.$inferSelect;
}

export function PatientCard({ patient }: PatientCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const patientInitials = patient.name
    .split(" ")
    .map((name) => name[0])
    .join("");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/no-image.png" />
            <AvatarFallback>{patientInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium">{patient.name}</p>
            <p className="text-sm text-muted-foreground">
              {patient.sex === "male" ? "Masculino" : "Feminino"}
            </p>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-2">
        <Badge variant="outline">
          <MailIcon className="mr-1 h-4 w-4" />
          {patient.email}
        </Badge>
        <Badge variant="outline">
          <PhoneIcon className="mr-1 h-4 w-4" />
          {patient.phone}
        </Badge>
      </CardContent>
      <Separator />
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Ver detalhes</Button>
          </DialogTrigger>
          {isDialogOpen && (
            <PatientForm
              key={`patient-form-${patient.id}-${isDialogOpen}`}
              defaultValues={patient}
              onSuccess={() => setIsDialogOpen(false)}
            />
          )}
        </Dialog>
      </CardFooter>
    </Card>
  );
}
