export async function sendWhatsAppPrescription(phone: string, text: string) {
  console.log(`[WhatsApp] Sending message to ${phone}:\n${text}`);
  
  const apiKey = process.env.MSGDROP_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://api.msgdrop.io/v1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message: text,
        }),
      });
      if (!response.ok) {
        console.error(`[WhatsApp] MsgDrop API error: ${response.statusText}`);
      }
    } catch (err) {
      console.error("[WhatsApp] Failed to call MsgDrop API:", err);
    }
  }
}
