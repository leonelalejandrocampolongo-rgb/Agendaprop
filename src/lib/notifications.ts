import type { Appointment, Service } from "@/lib/db-types";
import { sendEmail } from "@/lib/email";
import { formatDateLong, formatPrice } from "@/lib/format";

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
    tasks.push(
      sendEmail({
        to: appointment.clientEmail,
        subject: "Recibimos tu turno",
        html: `
          <p>Hola ${appointment.clientName},</p>
          <p>Recibimos tu solicitud de turno para <strong>${summary}</strong>.</p>
          <p>Todavía está <strong>pendiente de confirmación</strong>; te vamos a avisar en cuanto lo confirmemos.</p>
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
