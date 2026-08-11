import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface TicketNotificationData {
  pnr: string;
  passengerName: string;
  passengerPhone: string; // e.g. "03001234567" or "+923001234567"
  busOperator: string;
  seatNumbers: string[];
  boardingTerminal: string;
  dropTerminal: string;
  departureTime: string; // Formatted date string
  totalPricePKR: number;
}

/**
 * Formats Pakistani mobile numbers into E.164 standard (+923001234567)
 */
function formatPakistaniPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // Remove non-digits
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

/**
 * Send WhatsApp Confirmation via Twilio
 */
export async function sendWhatsAppTicket(
  data: TicketNotificationData,
): Promise<boolean> {
  if (!twilioClient) {
    console.warn("Twilio credentials missing in .env");
    return false;
  }

  const formattedPhone = formatPakistaniPhoneNumber(data.passengerPhone);
  const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com"}/ticket/${data.pnr}`;

  const messageBody = `🚌 *BUS TICKET CONFIRMATION* - ${data.busOperator}

Dear *${data.passengerName}*, your trip is confirmed!

📍 *PNR:* ${data.pnr}
🎟️ *Seat(s):* ${data.seatNumbers.join(", ")}
🏁 *Route:* ${data.boardingTerminal} ➔ ${data.dropTerminal}
⏰ *Departure:* ${data.departureTime}
💰 *Total Paid:* Rs. ${data.totalPricePKR.toLocaleString()}

🔗 *View & Download E-Ticket:*
${ticketUrl}

Please arrive at the terminal 15 minutes before departure. Have a safe journey!`;

  try {
    const message = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886",
      to: `whatsapp:${formattedPhone}`,
      body: messageBody,
    });

    console.log(
      `WhatsApp sent successfully to ${formattedPhone} (SID: ${message.sid})`,
    );
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp notification:", error);
    return false;
  }
}

/**
 * Send SMS via Local Pakistani Gateway (e.g. VeeVo, BrandSMS, SMS Gateway Hub)
 */
export async function sendLocalSMS(
  data: TicketNotificationData,
): Promise<boolean> {
  const apiKey = process.env.LOCAL_SMS_API_KEY;
  const senderId = process.env.LOCAL_SMS_SENDER_ID || "BUS_APP";
  const phone = formatPakistaniPhoneNumber(data.passengerPhone).replace(
    "+",
    "",
  ); // Local APIs usually prefer '923001234567'

  if (!apiKey) {
    console.warn("LOCAL_SMS_API_KEY missing in .env");
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourapp.com";
  const smsText = `Booking Confirmed! PNR: ${data.pnr}, Seats: ${data.seatNumbers.join(",")}, From: ${data.boardingTerminal} To: ${data.dropTerminal}, Departure: ${data.departureTime}. Download ticket: ${appUrl}/ticket/${data.pnr}`;

  try {
    // Example HTTP request for a local Pakistani SMS API:
    const response = await fetch("https://api.veevotech.com/v3/sendsms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash: apiKey,
        receivernum: phone,
        sendernum: senderId,
        textmessage: smsText,
      }),
    });

    const result = await response.json();
    console.log(`Local SMS sent to ${phone}:`, result);
    return true;
  } catch (error) {
    console.error("Failed to send local SMS:", error);
    return false;
  }
}

/**
 * Prefer WhatsApp; fall back to local SMS if WhatsApp fails.
 */
export async function notifyPassengerTicket(
  data: TicketNotificationData,
): Promise<{ whatsapp: boolean; sms: boolean }> {
  const whatsapp = await sendWhatsAppTicket(data);
  const sms = whatsapp ? false : await sendLocalSMS(data);
  return { whatsapp, sms };
}
