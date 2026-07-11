"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createMedicalRecord } from "@/actions/create-medical-record";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  patientId: z.string().uuid(), doctorId: z.string().uuid(),
  type: z.enum(["consultation", "anamnesis", "evolution", "prescription", "exam"]),
  title: z.string().min(1, "Título é obrigatório"), notes: z.string().min(1, "Observações são obrigatórias"),
  recordedAt: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;
type Doctor = { id: string; name: string; specialty: string };

export function MedicalRecordForm({ patientId, doctors, onSuccess }: { patientId: string; doctors: Doctor[]; onSuccess: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { patientId, doctorId: "", type: "consultation", title: "", notes: "", recordedAt: new Date().toISOString().slice(0, 16) },
  });
  const { execute, isExecuting } = useAction(createMedicalRecord, {
    onSuccess: ({ data }) => { if (data?.success) { toast.success("Registro adicionado ao prontuário"); onSuccess(); } },
    onError: () => toast.error("Não foi possível salvar o registro"),
  });

  return <DialogContent className="sm:max-w-2xl">
    <DialogHeader><DialogTitle>Novo registro clínico</DialogTitle><DialogDescription>Adicione uma informação ao histórico do paciente.</DialogDescription></DialogHeader>
    <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit((values) => execute({ ...values, recordedAt: new Date(values.recordedAt) }))}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="doctorId" render={({ field }) => <FormItem><FormLabel>Profissional</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{doctors.map((doctor) => <SelectItem key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.specialty}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
        <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="consultation">Consulta</SelectItem><SelectItem value="anamnesis">Anamnese</SelectItem><SelectItem value="evolution">Evolução</SelectItem><SelectItem value="prescription">Prescrição</SelectItem><SelectItem value="exam">Exame</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
      </div>
      <FormField control={form.control} name="recordedAt" render={({ field }) => <FormItem><FormLabel>Data e hora</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ex.: Consulta de retorno" {...field} /></FormControl><FormMessage /></FormItem>} />
      <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Observações clínicas</FormLabel><FormControl><textarea className="border-input min-h-36 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Registre informações relevantes..." {...field} /></FormControl><FormMessage /></FormItem>} />
      <DialogFooter><Button type="submit" disabled={isExecuting}>{isExecuting ? "Salvando..." : "Salvar registro"}</Button></DialogFooter>
    </form></Form>
  </DialogContent>;
}
