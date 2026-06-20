import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const handoffSchema = z.object({
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  channel: z.string().optional(),
  reason: z.string().trim().min(1),
  transcript: z.string().trim().min(1),
});

export const POST = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const input = handoffSchema.parse(await request.json());

    console.info("n8n conversation handoff", {
      clinicId: auth.clinicId,
      ...input,
    });

    return NextResponse.json({
      success: true,
      message:
        "Vou encaminhar sua conversa para a equipe da clínica te ajudar com segurança.",
      handoff: {
        clinicId: auth.clinicId,
        status: "pending",
        reason: input.reason,
      },
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
