import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "AgendaProp <onboarding@resend.dev>";

/**
 * Manda un email si RESEND_API_KEY está configurada; si no, solo lo loguea.
 * Nunca tira una excepción: un email que falla no debe romper una reserva.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY no configurada. Para "${to}": ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] no se pudo enviar", err);
  }
}
