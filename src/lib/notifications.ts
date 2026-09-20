import type { Appointment, Pack, Service } from "@/lib/db-types";
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

/**
 * `packSession`, si se pasa, agrega el detalle "Sesión N de M" al email —
 * usado cuando el turno pertenece a un pack. No se vuelve a pedir seña.
 */
export async function notifyAppointmentStatusChange(
  appointment: Appointment,
  service: Service,
  packSession?: { number: number; total: number },
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
      ${packSession ? `<p>${service.name}<br/>Sesión ${packSession.number} de ${packSession.total}</p>` : ""}
    `,
  });
}

/** Email al pedir un pack: pago inicial del 50%, alias y botón de WhatsApp. */
export async function notifyNewPackRequest(
  pack: Pack,
  firstSession: Appointment,
  service: Service,
  adminEmails: string[],
): Promise<void> {
  const depositAmount = formatPrice(pack.totalPriceCents / 2);
  const totalAmount = formatPrice(pack.totalPriceCents);
  const when = `${formatDateLong(firstSession.date)} a las ${firstSession.startTime} hs`;

  const tasks: Promise<void>[] = [];

  if (pack.clientEmail) {
    const whatsappLink = buildWhatsAppLink(
      DEPOSIT_WHATSAPP_NUMBER,
      `Hola! Te envío el comprobante del pago inicial para mi pack de ${service.name} (${pack.sessionsCount} sesiones).`,
    );
    tasks.push(
      sendEmail({
        to: pack.clientEmail,
        subject: "Recibimos tu solicitud de pack",
        html: `
          <p>Hola ${pack.clientName},</p>
          <p>Recibimos tu solicitud de <strong>${pack.name}</strong>.</p>
          <p>Primera sesión: <strong>${when}</strong>.</p>
          <p>Pack x${pack.sessionsCount}: <strong>${totalAmount}</strong></p>
          <p>Pago inicial 50%: <strong>${depositAmount}</strong></p>
          <p><strong>Alias:</strong> ${DEPOSIT_ALIAS}</p>
          <p>Para reservar tu pack se solicita un pago inicial del 50%. Tu primera
          sesión quedará pendiente de confirmación hasta que recibamos el
          comprobante. Una vez confirmado el pack, coordinaremos las sesiones
          restantes.</p>
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
        subject: `Nuevo pack pendiente: ${service.name}`,
        html: `
          <p>Nueva solicitud de pack:</p>
          <ul>
            <li><strong>Pack:</strong> ${pack.name} (x${pack.sessionsCount})</li>
            <li><strong>Primera sesión:</strong> ${when}</li>
            <li><strong>Cliente:</strong> ${pack.clientName}</li>
            <li><strong>Teléfono:</strong> ${pack.clientPhone}</li>
            ${pack.clientEmail ? `<li><strong>Email:</strong> ${pack.clientEmail}</li>` : ""}
            <li><strong>Precio total:</strong> ${totalAmount}</li>
          </ul>
        `,
      }),
    );
  }

  await Promise.allSettled(tasks);
}

/** Email al confirmar el pack (recibido el pago inicial). */
export async function notifyPackConfirmed(
  pack: Pack,
  confirmedSession: Appointment,
): Promise<void> {
  if (!pack.clientEmail) return;

  const when = `${formatDateLong(confirmedSession.date)} a las ${confirmedSession.startTime} hs`;
  await sendEmail({
    to: pack.clientEmail,
    subject: "¡Tu pack está confirmado!",
    html: `
      <p>Hola ${pack.clientName},</p>
      <p>¡Tu pack está confirmado!</p>
      <p>Recibimos tu pago inicial y tu primera sesión quedó confirmada.</p>
      <p><strong>${pack.name}</strong></p>
      <p>Fecha: <strong>${confirmedSession.date}</strong></p>
      <p>Hora: <strong>${confirmedSession.startTime}</strong></p>
      <p>Te esperamos ${when}.</p>
      <p>Las próximas sesiones forman parte del mismo pack y no es necesario
      volver a abonar una seña por cada turno.</p>
    `,
  });
}
