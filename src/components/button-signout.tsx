"use client";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";

export default function ButtonSignOut() {
  return (
    <div>
      <Button onClick={() => authClient.signOut()}>Sair</Button>
    </div>
  );
}
