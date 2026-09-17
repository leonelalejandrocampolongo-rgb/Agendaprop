# AgendaProp

App de reserva de turnos online para servicios de masajes, faciales y
estética (tipo "Tu Turno"). Las clientas reservan solas desde una página
pública, y la administradora gestiona servicios, horarios y turnos desde un
panel privado.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- NextAuth (Credentials) para el login del panel admin
- Los datos se guardan en un archivo JSON local (`data/db.json`), sin base
  de datos externa. Pensado para un proyecto personal chico; se puede migrar
  a una base de datos real más adelante si hace falta.

## Primeros pasos

```bash
npm install
npm run seed   # crea data/db.json con un admin y servicios de ejemplo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para la página pública
de reserva, y [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
para el panel de administración.

El `npm run seed` imprime el email y contraseña del admin creado. Para
elegir tus propias credenciales desde el arranque:

```bash
ADMIN_EMAIL=vos@ejemplo.com ADMIN_PASSWORD=algoSeguro123 npm run seed
```

(Si `data/db.json` ya existe con un admin cargado, el seed no pisa nada.)

## Estructura

- `/` — página pública con los servicios activos.
- `/reservar` — flujo de reserva: servicio → fecha → horario → datos de contacto.
- `/admin` — panel de administración (protegido por login):
  - **Resumen**: turnos de hoy y estadísticas rápidas.
  - **Turnos**: listado completo con filtros, para confirmar/cancelar/completar.
  - **Servicios**: alta, edición, baja de servicios (nombre, duración, precio).
  - **Horarios**: horario semanal de atención y bloqueos puntuales (feriados, etc).
- `src/lib/db.ts` — capa de acceso al archivo JSON (lecturas/escrituras serializadas).
- `src/lib/availability.ts` — cálculo de horarios disponibles según el
  horario semanal, los bloqueos y los turnos ya reservados.

## Notificaciones

- **Email**: al reservar (a la clienta y a todos los admins) y al confirmar/
  cancelar un turno (a la clienta), si tiene email cargado. Usa
  [Resend](https://resend.com); sin `RESEND_API_KEY` configurada, la app
  funciona igual pero solo deja un log en consola en vez de mandar el mail.
- **WhatsApp**: no es automático (no requiere ninguna cuenta ni costo). En
  la pantalla de confirmación de la reserva aparece un botón "Avisar por
  WhatsApp" que abre un chat con el negocio con el mensaje ya escrito. En el
  panel admin, cada turno tiene un botón "WhatsApp" que abre un chat con la
  clienta, también con el mensaje precargado.

## Variables de entorno

Ver `.env.example`. `AUTH_SECRET` es requerido por NextAuth; generá uno
propio para producción (por ejemplo con `openssl rand -base64 32`).
`RESEND_API_KEY` y `NEXT_PUBLIC_BUSINESS_WHATSAPP_NUMBER` son opcionales
(ver sección de Notificaciones).

## Próximos pasos posibles

- WhatsApp 100% automático (requiere WhatsApp Business API o Twilio).
- Recordatorios automáticos el día previo al turno.
- Métricas de ingresos por período.
- Migrar `data/db.json` a una base de datos real si el uso crece.
