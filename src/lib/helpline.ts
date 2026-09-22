export const HELPLINE_DISPLAY = "03312882767";
export const HELPLINE_TEL = "03312882767";
export const HELPLINE_WHATSAPP = "923312882767";

export function helplineWhatsAppHref(text: string): string {
  return `https://wa.me/${HELPLINE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
