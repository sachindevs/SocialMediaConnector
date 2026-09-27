const LINKEDIN_API = 'https://api.linkedin.com/v2';

export async function sendMessage(
  accessToken: string,
  conversationUrn: string,
  text: string
): Promise<void> {
  const res = await fetch(`${LINKEDIN_API}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      recipients: [conversationUrn],
      subject: '',
      body: text,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`LinkedIn sendMessage failed: ${JSON.stringify(data)}`);
  }
}

export async function getProfile(
  accessToken: string,
  personUrn: string
): Promise<{ id: string; firstName: string; lastName: string }> {
  const personId = personUrn.replace('urn:li:person:', '');
  const res = await fetch(
    `${LINKEDIN_API}/people/(id:${personId})?(fields=id,firstName,lastName)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return { id: personUrn, firstName: 'LinkedIn', lastName: 'User' };
  const data = await res.json();
  return {
    id: data.id,
    firstName: data.firstName?.localized?.en_US || 'LinkedIn',
    lastName: data.lastName?.localized?.en_US || 'User',
  };
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('LinkedIn token refresh failed');
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
