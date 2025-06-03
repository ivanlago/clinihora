import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { MenuSidebar } from "./_components/menu-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MenuSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
