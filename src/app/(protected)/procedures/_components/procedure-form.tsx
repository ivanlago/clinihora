"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { deleteProcedure } from "@/actions/delete-procedure";
import { upsertProcedure } from "@/actions/upsert-procedure";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { proceduresTable } from "@/db/schema";

const procedureSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  priceInCents: z.number().min(0, "Preço deve ser maior ou igual a zero"),
  durationInMinutes: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(5, "Duração deve ser de pelo menos 5 minutos"),
  isActive: z.boolean(),
});

type ProcedureFormValues = z.infer<typeof procedureSchema>;

interface ProcedureFormProps {
  procedure?: typeof proceduresTable.$inferSelect;
  onSuccess?: () => void;
}

export function ProcedureForm({ procedure, onSuccess }: ProcedureFormProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      name: procedure?.name ?? "",
      description: procedure?.description ?? "",
      priceInCents: procedure?.priceInCents
        ? procedure.priceInCents / 100
        : 0,
      durationInMinutes: procedure?.durationInMinutes ?? 30,
      isActive: procedure?.isActive ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      name: procedure?.name ?? "",
      description: procedure?.description ?? "",
      priceInCents: procedure?.priceInCents
        ? procedure.priceInCents / 100
        : 0,
      durationInMinutes: procedure?.durationInMinutes ?? 30,
      isActive: procedure?.isActive ?? true,
    });
  }, [form, procedure]);

  const upsertProcedureAction = useAction(upsertProcedure, {
    onSuccess: () => {
      toast.success("Procedimento salvo com sucesso");
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast.error("Erro ao salvar procedimento");
    },
  });

  async function onSubmit(values: ProcedureFormValues) {
    try {
      await upsertProcedureAction.executeAsync({
        ...values,
        id: procedure?.id,
        priceInCents: Math.round(values.priceInCents * 100),
      });
    } catch (error) {
      console.error("Error saving procedure:", error);
      toast.error("Erro ao salvar procedimento");
    }
  }

  async function handleDeleteProcedure() {
    if (!procedure?.id) return;

    try {
      setIsDeleting(true);
      await deleteProcedure(procedure.id);
      toast.success("Procedimento deletado com sucesso");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao deletar procedimento");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {procedure ? "Editar procedimento" : "Adicionar procedimento"}
        </DialogTitle>
        <DialogDescription>
          {procedure
            ? "Edite as informações do procedimento"
            : "Adicione um novo procedimento"}
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
                  <Input placeholder="Nome do procedimento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Descrição opcional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="priceInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço</FormLabel>
                  <NumericFormat
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value.floatValue ?? 0);
                    }}
                    decimalScale={2}
                    fixedDecimalScale
                    decimalSeparator=","
                    allowNegative={false}
                    allowLeadingZeros={false}
                    thousandSeparator="."
                    customInput={Input}
                    prefix="R$ "
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationInMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      step={5}
                      placeholder="30"
                      {...field}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>Em minutos</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Procedimento ativo</FormLabel>
                  <FormDescription>
                    Procedimentos inativos ficam cadastrados, mas podem ser
                    ocultados em fluxos de agendamento.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <DialogFooter className="sm:justify-end">
            {procedure && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Deletar procedimento</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Tem certeza que deseja deletar o procedimento?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser revertida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProcedure}
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
            <Button type="submit" disabled={upsertProcedureAction.isPending}>
              {upsertProcedureAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {procedure ? "Salvar alterações" : "Adicionar procedimento"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
