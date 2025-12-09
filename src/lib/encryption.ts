import crypto from 'crypto';

// Use a secret key from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production';

// Ensure key is 32 bytes for AES-256
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

// Mask card number for display (show first 6 and last 4)
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  if (cleaned.length < 10) return cleaned;
  const first6 = cleaned.slice(0, 6);
  const last4 = cleaned.slice(-4);
  const masked = '••••••';
  return `${first6}${masked}${last4}`;
}

// Format card number with spaces
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}
