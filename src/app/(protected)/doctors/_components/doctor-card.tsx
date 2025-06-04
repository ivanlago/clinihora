"use client";
import { Avatar } from "@radix-ui/react-avatar";
import { Calendar1Icon, ClockIcon, DollarSignIcon } from "lucide-react";
import React, { useState } from "react";

import { formatCurrencyInCents } from "@/_helpers/currency";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { doctorsTable } from "@/db/schema";

import { getAvailability } from "../_helpers/availability";
import DoctorForm from "./doctor-form";

interface DoctorCardProps {
  doctor: typeof doctorsTable.$inferSelect;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const doctorInitials = doctor.name
    .split(" ")
    .map((name) => name[0])
    .join("");

  const availability = getAvailability(doctor);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src={doctor?.avatarImageUrl || "/no-image.png"} />
            <AvatarFallback>{doctorInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-sm font-medium">{doctor.name}</p>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-2">
        <Badge variant="outline">
          <Calendar1Icon className="mr-1" />
          {availability.from.format("dddd")} a {availability.to.format("dddd")}
        </Badge>
        <Badge variant="outline">
          <ClockIcon className="mr-1" />
          {availability.from.format("HH:mm")} às{" "}
          {availability.to.format("HH:mm")}
        </Badge>
        <Badge variant="outline">
          <DollarSignIcon className="mr-1" />{" "}
          {formatCurrencyInCents(doctor.appointmentPriceInCents)}
        </Badge>
      </CardContent>
      <Separator />
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Ver detalhes</Button>
          </DialogTrigger>
          <DoctorForm
            doctor={{
              ...doctor,
              availableFromTime: availability.from.format("HH:mm:ss"),
              availableToTime: availability.to.format("HH:mm:ss"),
            }}
            onSuccess={() => setIsDialogOpen(false)}
          />
        </Dialog>
      </CardFooter>
    </Card>
  );
}
