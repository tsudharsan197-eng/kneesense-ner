// Salted-hash PIN verification via Web Crypto's SubtleCrypto (available in
// both the browser and the Capacitor WebView, no extra plugin needed). The
// PIN itself is never stored — only a hash, salted per-install so two
// devices with the same PIN don't produce the same stored hash.

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(digest);
}
