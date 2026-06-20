import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  const n8nWhatsappUrl = process.env.NEXT_PUBLIC_N8N_WHATSAPP_URL || "/n8n-test";

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-semibold">CliniHora</h1>
      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href="/authentication">Login</Link>
        </Button>
        <Button variant="outline" size="icon" asChild>
          <Link href={n8nWhatsappUrl} aria-label="Atendimento pelo WhatsApp">
            <MessageCircleIcon className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
