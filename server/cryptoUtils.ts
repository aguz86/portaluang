import crypto from 'crypto';

// Use environment variable for the encryption key, with a 32-byte fallback for this preview
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'duitku_secret_enc_key_32_bytes_!';
const IV_LENGTH = 16; 

export function encrypt(text: string): string {
  if (!text) return text;
  if (text.startsWith('enc:')) return text; 
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return 'enc:' + iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text) return text;
  if (!text.startsWith('enc:')) return text; 

  try {
    const textParts = text.split(':');
    textParts.shift(); // remove 'enc'
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed:', err);
    return ''; // Return empty string or original text? Empty string is safer if decryption fails
  }
}
