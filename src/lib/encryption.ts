import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPTION_KEY!;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv(32 hex) + authTag(32 hex) + encrypted(hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const iv = Buffer.from(ciphertext.slice(0, 32), 'hex');
  const authTag = Buffer.from(ciphertext.slice(32, 64), 'hex');
  const encrypted = Buffer.from(ciphertext.slice(64), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
