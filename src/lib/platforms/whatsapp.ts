const META_API = 'https://graph.facebook.com/v18.0';

export async function sendMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string
): Promise<void> {
  const res = await fetch(`${META_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`WhatsApp sendMessage failed: ${JSON.stringify(data.error)}`);
  }
}

export async function getMediaUrl(
  accessToken: string,
  mediaId: string
): Promise<string> {
  const res = await fetch(`${META_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`WhatsApp getMedia failed: ${res.status}`);
  const data = await res.json();
  return data.url as string;
}

export async function downloadMedia(
  accessToken: string,
  mediaUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download WhatsApp media: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}
