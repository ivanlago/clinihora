"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function DashboardSignOut() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.push("/authentication"),
        },
      });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div>
      <Button variant={"outline"} onClick={handleSignOut}>
        <LogOutIcon />
        Sair
      </Button>
    </div>
  );
}
