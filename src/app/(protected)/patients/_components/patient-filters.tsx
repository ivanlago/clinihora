"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PatientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get("search") ?? "";
  const sex = searchParams.get("sex") ?? "all";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      startTransition(() => {
        router.push(`${pathname}?${createQueryString("search", value)}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, createQueryString]
  );

  const handleSexChange = useCallback(
    (value: string) => {
      startTransition(() => {
        router.push(`${pathname}?${createQueryString("sex", value)}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, createQueryString]
  );

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar pacientes..."
          className="pl-8"
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <Select defaultValue={sex} onValueChange={handleSexChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Filtrar por sexo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="male">Masculino</SelectItem>
          <SelectItem value="female">Feminino</SelectItem>
        </SelectContent>
      </Select>
      {search || sex !== "all" ? (
        <Button
          variant="ghost"
          onClick={() => {
            startTransition(() => {
              router.push(pathname, { scroll: false });
            });
          }}
          disabled={isPending}
        >
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
