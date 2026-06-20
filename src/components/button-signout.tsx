"use client";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function ButtonSignOut() {
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div>
      <Button onClick={handleSignOut}>Sair</Button>
    </div>
  );
}
