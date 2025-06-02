"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { Button } from "../../../components/ui/button";

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
