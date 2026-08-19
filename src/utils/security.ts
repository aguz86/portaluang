import DOMPurify from 'dompurify';

/**
 * List of known gambling/phishing/spam keyword patterns for Indonesian and International contexts
 */
export const MALICIOUS_PATTERNS = [
  /slot\s*(gacor|online|maxwin|dana|pulsa|olympus|zeus)/i,
  /judi\s*(online|slot|bola|togel|poker)/i,
  /situs\s*(judi|slot|gacor|taruhan|togel)/i,
  /bandar\s*(judi|togel|slot|bola|qq|pkv)/i,
  /agen\s*(judi|slot|togel|bola|casino)/i,
  /bocoran\s*(slot|admin\s*jarwo|rtp)/i,
  /rtp\s*(live|slot|gacor)/i,
  /pragmatic\s*play/i,
  /mahjong\s*ways/i,
  /daftar\s*slot/i,
  /link\s*alternatif\s*(slot|judi|sbobet)/i,
  /sbobet/i,
  /pkv\s*games/i,
  /depo\s*(pulsa|e-?wallet|dana|gopay|ovo)\s*tanpa\s*potongan/i,
  /bonus\s*new\s*member\s*100/i,
  /freebet/i,
  /<script\b/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i
];

/**
 * Check if text contains suspected gambling, phishing, or malicious injection patterns
 */
export function checkMaliciousContent(text: string): { isMalicious: boolean; reason?: string } {
  if (!text || typeof text !== 'string') return { isMalicious: false };
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        isMalicious: true, 
        reason: `Konten terdeteksi mengandung pola tidak aman atau kata kunci berbahaya (${pattern.toString()})` 
      };
    }
  }
  return { isMalicious: false };
}

/**
 * Validates whether a URL is safe for navigation and embedding.
 * Only allows http, https, mailto, tel, and relative root paths.
 * Blocks javascript:, data:, vbscript:, and file: schemes.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  
  // Allow relative URLs starting with / or #
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    // Ensure no double slash protocol evasion like //malicious.com
    return !trimmed.startsWith('//');
  }

  try {
    const parsed = new URL(trimmed, 'https://localhost');
    const protocol = parsed.protocol.toLowerCase();
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML with strict DOMPurify configuration
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'a', 'span', 'div', 'img', 'del', 'sup', 'sub'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'alt', 'src', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
    FORCE_BODY: true,
    RETURN_TRUSTED_TYPE: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i
  });
}
