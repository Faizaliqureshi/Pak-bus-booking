export const HELPLINE_DISPLAY = "03123137349";
export const HELPLINE_TEL = "03123137349";
export const HELPLINE_WHATSAPP = "923123137349";

export function helplineWhatsAppHref(text: string): string {
  return `https://wa.me/${HELPLINE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
