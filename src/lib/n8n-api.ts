import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type N8nApiAuthResult = { authenticated: true } | { error: NextResponse };
type N8nClinicAuthResult = { clinicId: string } | { error: NextResponse };

const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export const n8nApiError = (
  error: string,
  status: number,
  details?: unknown
) => {
  return NextResponse.json(
    apiErrorSchema.parse({
      error,
      details,
    }),
    { status }
  );
};

export const requireN8nApiAuth = (
  request: NextRequest
): N8nApiAuthResult => {
  const configuredApiKey = process.env.N8N_API_KEY;
  const authorization = request.headers.get("authorization");
  const apiKey = authorization?.replace(/^Bearer\s+/i, "");

  if (!configuredApiKey) {
    return {
      error: n8nApiError("N8N_API_KEY is not configured", 500),
    };
  }

  if (!apiKey || apiKey !== configuredApiKey) {
    return {
      error: n8nApiError("Unauthorized", 401),
    };
  }

  return {
    authenticated: true,
  };
};

export const requireN8nClinicAuth = (
  request: NextRequest
): N8nClinicAuthResult => {
  const auth = requireN8nApiAuth(request);
  const clinicId = request.headers.get("x-clinic-id");

  if ("error" in auth) {
    return auth;
  }

  if (!clinicId) {
    return {
      error: n8nApiError("X-Clinic-Id header is required", 400),
    };
  }

  return {
    clinicId,
  };
};

export const handleN8nApiError = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return n8nApiError("Invalid request payload", 400, error.flatten());
  }

  if (error instanceof Error) {
    return n8nApiError(error.message, 400);
  }

  return n8nApiError("Unexpected error", 500);
};
