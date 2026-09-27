const TELEGRAM_API = 'https://api.telegram.org';

export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secretToken }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`Telegram setWebhook failed: ${data.description}`);
  }
}

export async function sendMessage(
  botToken: string,
  chatId: string | number,
  text: string
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(`Telegram sendMessage failed: ${data.description}`);
  }
}

export async function deleteWebhook(botToken: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken}/deleteWebhook`, { method: 'POST' });
}

export async function getFile(botToken: string, fileId: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) throw new Error('Failed to get Telegram file');
  return `${TELEGRAM_API}/file/bot${botToken}/${data.result.file_path}`;
}
