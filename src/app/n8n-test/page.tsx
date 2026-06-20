"use client";

import { Loader2Icon, WorkflowIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TestStatus = "idle" | "loading" | "success" | "error";

export default function N8nTestPage() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState("");

  const handleTest = async () => {
    setStatus("loading");
    setResult("");

    try {
      const response = await fetch("/api/n8n/clinics", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const data = await response.json();

      setResult(JSON.stringify(data, null, 2));
      setStatus(response.ok ? "success" : "error");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Erro inesperado");
      setStatus("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Teste n8n</h1>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="N8N_API_KEY"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button onClick={handleTest} disabled={!apiKey || status === "loading"}>
            {status === "loading" && (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Testar conexão
          </Button>
        </div>
        {result && (
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted p-3 text-sm">
            {result}
          </pre>
        )}
      </section>
    </main>
  );
}
