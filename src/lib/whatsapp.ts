/** Link de WhatsApp con mensaje precargado (no envía nada solo: abre el chat listo para tocar "Enviar"). */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

export const BUSINESS_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP_NUMBER || "";
