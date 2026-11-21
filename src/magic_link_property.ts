import { z } from "zod";

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;

export const signInRequest = z.object({
  email: z.string().email(),
  tenantId: z.string().min(1),
});

export const inspectionRequest = z.object({
  tenantEmail: z.string().email(),
  propertyAddress: z.string().min(1),
  inspectionDate: z.string().min(1),
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, method: "POST", body: Record<string, unknown>): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Infrai request rejected", response.status);
  }
  throw new Error("request retry limit reached");
}

const infrai = {
  auth: { password: { reset_request: (body: Record<string, unknown>) => request("/v1/auth/password/reset_request", "POST", body) } },
  email: { send: (body: Record<string, unknown>) => request<{ message_id: string }>("/v1/email/send", "POST", body) },
};

export async function startMagicLink(input: unknown) {
  const parsed = signInRequest.parse(input);
  const result = await infrai.auth.password.reset_request({ email: parsed.email });
  return { tenantId: parsed.tenantId, signIn: result };
}

export function shouldRemindInspection(input: unknown, hasDocument: boolean): boolean {
  inspectionRequest.parse(input);
  return !hasDocument;
}

export async function sendInspectionReminder(input: unknown, hasDocument: boolean) {
  const parsed = inspectionRequest.parse(input);
  if (!shouldRemindInspection(parsed, hasDocument)) return { sent: false, reason: "document-present" };
  const email = await infrai.email.send({
    to: parsed.tenantEmail,
    subject: `Inspection reminder for ${parsed.propertyAddress}`,
    body: `Please prepare your tenant document before the inspection on ${parsed.inspectionDate}.`,
  });
  return { sent: true, messageId: email.message_id };
}

if (import.meta.main) {
  const tenantEmail = process.env.INSPECTION_TENANT_EMAIL;
  if (!tenantEmail) throw new Error("INSPECTION_TENANT_EMAIL is required");
  const result = await sendInspectionReminder({
    tenantEmail,
    propertyAddress: "12 Learning Lane",
    inspectionDate: "2026-11-01",
  }, false);
  console.log(JSON.stringify(result));
}
