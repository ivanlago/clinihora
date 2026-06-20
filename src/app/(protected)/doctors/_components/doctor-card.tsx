"use client";
import { Avatar } from "@radix-ui/react-avatar";
import {
  Calendar1Icon,
  ClockIcon,
  DollarSignIcon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";
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

type DoctorWithGoogleCalendar = typeof doctorsTable.$inferSelect & {
  googleCalendarAccount?: {
    googleEmail: string;
  } | null;
};

interface DoctorCardProps {
  doctor: DoctorWithGoogleCalendar;
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
        {doctor.email && (
          <Badge variant="outline">
            <MailIcon className="mr-1 h-4 w-4" />
            {doctor.email}
          </Badge>
        )}
        {doctor.phone && (
          <Badge variant="outline">
            <PhoneIcon className="mr-1 h-4 w-4" />
            {doctor.phone}
          </Badge>
        )}
        <div className="flex flex-col gap-2">
          {availability.map((day) => (
            <div
              key={day.dayOfWeek.format("dddd")}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="w-24">
                <Calendar1Icon className="mr-1" />
                {day.dayOfWeek.format("dddd")}
              </Badge>
              <Badge variant="outline">
                <ClockIcon className="mr-1" />
                {day.from.format("HH:mm")} às {day.to.format("HH:mm")}
              </Badge>
            </div>
          ))}
        </div>
        <Badge variant="outline">
          <DollarSignIcon className="mr-1" />{" "}
          {formatCurrencyInCents(doctor.appointmentPriceInCents)}
        </Badge>
        <Badge
          variant={doctor.googleCalendarAccount ? "default" : "outline"}
          className="justify-start"
        >
          <Calendar1Icon className="mr-1 h-4 w-4" />
          {doctor.googleCalendarAccount
            ? `Google Agenda: ${doctor.googleCalendarAccount.googleEmail}`
            : "Google Agenda não conectada"}
        </Badge>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col gap-2">
        <Button variant="outline" className="w-full" asChild>
          <a href={`/api/google-calendar/connect?doctorId=${doctor.id}`}>
            <LinkIcon className="mr-2 h-4 w-4" />
            {doctor.googleCalendarAccount
              ? "Reconectar Google Agenda"
              : "Conectar Google Agenda"}
          </a>
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Ver detalhes</Button>
          </DialogTrigger>
          {isDialogOpen && (
            <DoctorForm
              key={`doctor-form-${doctor.id}-${isDialogOpen}`}
              doctor={doctor}
              onSuccess={() => setIsDialogOpen(false)}
            />
          )}
        </Dialog>
      </CardFooter>
    </Card>
  );
}
