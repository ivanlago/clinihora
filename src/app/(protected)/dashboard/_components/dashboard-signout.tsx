"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function DashboardSignOut() {
  const router = useRouter();
  return (
    <div>
      <Button
        variant={"outline"}
        onClick={() =>
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/authentication"),
            },
          })
        }
      >
        <LogOutIcon />
        Sair
      </Button>
    </div>
  );
}
