import { MenuIcon } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { MenuSidebar } from "./_components/menu-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MenuSidebar />
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
          <SidebarTrigger className="size-9" aria-label="Abrir menu">
            <MenuIcon className="size-5" />
          </SidebarTrigger>
          <span className="text-base font-semibold">CliniHora</span>
        </header>
        <SidebarTrigger className="m-2 hidden md:inline-flex" />
        {children}
      </main>
    </SidebarProvider>
  );
}
