import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { deletePatient } from "@/actions/delete-patient";
import { upsertPatient } from "@/actions/upsert-patient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { patientsTable } from "@/db/schema";

const patientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  sex: z.enum(["male", "female"], {
    required_error: "Sexo é obrigatório",
  }),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSuccess?: () => void;
}

export function PatientForm({ defaultValues, onSuccess }: PatientFormProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      sex: undefined,
      ...defaultValues,
    },
  });

  // Reset form when defaultValues change
  useEffect(() => {
    form.reset({
      name: "",
      email: "",
      phone: "",
      sex: undefined,
      ...defaultValues,
    });
  }, [defaultValues, form]);

  const { execute, status } = useAction(upsertPatient, {
    onSuccess: () => {
      toast.success("Paciente salvo com sucesso");
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      const errorMessage =
        error.error?.validationErrors?._errors?.[0] ||
        error.error?.serverError ||
        "Erro ao salvar paciente";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: PatientFormValues) => {
    execute(data);
  };

  async function handleDeletePatient() {
    if (!defaultValues?.id) return;

    try {
      setIsDeleting(true);
      await deletePatient(defaultValues.id);
      toast.success("Paciente deletado com sucesso");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao deletar paciente");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {defaultValues?.id ? "Editar paciente" : "Adicionar paciente"}
        </DialogTitle>
        <DialogDescription>
          {defaultValues?.id
            ? "Edite as informações do paciente"
            : "Adicione um novo paciente"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do paciente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <PatternFormat
                    customInput={Input}
                    format="(##) #####-####"
                    mask="_"
                    placeholder="(00) 00000-0000"
                    onValueChange={(values) => {
                      field.onChange(values.value);
                    }}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="sm:justify-end">
            {defaultValues?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Deletar paciente</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Tem certeza que deseja deletar o paciente?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser revertida. Isso irá deletar o
                      paciente e todas as consultas agendadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletePatient}
                      disabled={isDeleting}
                    >
                      {isDeleting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" disabled={status === "executing"}>
              {status === "executing" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {defaultValues?.id ? "Salvar alterações" : "Adicionar paciente"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
