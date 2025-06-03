"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function DashboardSignOut() {
  const router = useRouter();
  return (
    <div>
      <Button
        onClick={() =>
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/authentication"),
            },
          })
        }
      >
        Sair
      </Button>
    </div>
  );
}
