import type { Appointment, Service } from "@/lib/db-types";
import { sendEmail } from "@/lib/email";
import { formatDateLong, formatPrice } from "@/lib/format";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const DEPOSIT_WHATSAPP_NUMBER = "1568464060";
const DEPOSIT_ALIAS = "mariana.cabello";

function appointmentSummary(appointment: Appointment, service: Service): string {
  return `${service.name} · ${formatDateLong(appointment.date)} a las ${appointment.startTime} hs`;
}

export async function notifyNewAppointment(
  appointment: Appointment,
  service: Service,
  adminEmails: string[],
): Promise<void> {
  const summary = appointmentSummary(appointment, service);

  const tasks: Promise<void>[] = [];

  if (appointment.clientEmail) {
    const depositAmount = formatPrice(service.priceCents / 2);
    const whatsappLink = buildWhatsAppLink(
      DEPOSIT_WHATSAPP_NUMBER,
      `Hola! Te envío el comprobante de la seña para mi turno de ${service.name} el ${formatDateLong(appointment.date)} a las ${appointment.startTime} hs.`,
    );
    tasks.push(
      sendEmail({
        to: appointment.clientEmail,
        subject: "Recibimos tu turno",
        html: `
          <p>Hola ${appointment.clientName},</p>
          <p>Recibimos tu solicitud de turno para <strong>${summary}</strong>.</p>
          <p>Para reservar tu turno se solicita una seña del 50% del valor del servicio (<strong>${depositAmount}</strong>).</p>
          <p><strong>Alias:</strong> ${DEPOSIT_ALIAS}</p>
          <p>Todavía está <strong>pendiente de confirmación</strong>; te vamos a avisar en cuanto recibamos la seña del 50% se confirmará el turno.</p>
          <p style="margin-top: 20px;">
            <a href="${whatsappLink}" style="display:inline-block;background-color:#C9A24A;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">
              Enviar comprobante por WhatsApp
            </a>
          </p>
        `,
      }),
    );
  }

  for (const email of adminEmails) {
    tasks.push(
      sendEmail({
        to: email,
        subject: `Nuevo turno pendiente: ${service.name}`,
        html: `
          <p>Nuevo turno reservado:</p>
          <ul>
            <li><strong>Servicio:</strong> ${service.name}</li>
            <li><strong>Fecha:</strong> ${formatDateLong(appointment.date)}</li>
            <li><strong>Horario:</strong> ${appointment.startTime}–${appointment.endTime}</li>
            <li><strong>Cliente:</strong> ${appointment.clientName}</li>
            <li><strong>Teléfono:</strong> ${appointment.clientPhone}</li>
            ${appointment.clientEmail ? `<li><strong>Email:</strong> ${appointment.clientEmail}</li>` : ""}
            ${appointment.notes ? `<li><strong>Notas:</strong> ${appointment.notes}</li>` : ""}
            <li><strong>Precio:</strong> ${formatPrice(service.priceCents)}</li>
          </ul>
        `,
      }),
    );
  }

  await Promise.allSettled(tasks);
}

const STATUS_EMAIL_COPY: Record<string, { subject: string; body: string } | undefined> = {
  CONFIRMED: {
    subject: "Tu turno fue confirmado",
    body: "¡Tu turno fue confirmado! Te esperamos.",
  },
  CANCELLED: {
    subject: "Tu turno fue cancelado",
    body: "Tu turno fue cancelado. Si fue un error o querés reprogramar, contactanos.",
  },
};

export async function notifyAppointmentStatusChange(
  appointment: Appointment,
  service: Service,
): Promise<void> {
  if (!appointment.clientEmail) return;

  const copy = STATUS_EMAIL_COPY[appointment.status];
  if (!copy) return;

  const summary = appointmentSummary(appointment, service);
  await sendEmail({
    to: appointment.clientEmail,
    subject: copy.subject,
    html: `
      <p>Hola ${appointment.clientName},</p>
      <p>${copy.body}</p>
      <p><strong>${summary}</strong></p>
    `,
  });
}
