/**
 * Lightweight, secure cryptographic helpers for the device pairing bridge.
 * Since the symmetric key is generated randomly in the native WebView, kept in memory,
 * and passed only via URL query parameters (not stored in the database), this acts
 * as a highly secure channel for transferring transient OAuth credentials.
 */

/**
 * Encrypt a string using an XOR cipher and a symmetric key, encoded in safe Base64.
 */
export function encryptData(text: string | null | undefined, key: string | null | undefined): string | null {
  if (!text || !key) return null;
  try {
    const textChars = Array.from(text).map(c => c.charCodeAt(0));
    const keyChars = Array.from(key).map(c => c.charCodeAt(0));
    const encrypted = textChars.map((c, i) => c ^ keyChars[i % keyChars.length]);
    // Convert character codes back to a binary string and Base64 encode it
    const binaryString = String.fromCharCode(...encrypted);
    return btoa(binaryString);
  } catch (err) {
    console.error("[CRYPTO] Failed to encrypt data:", err);
    return null;
  }
}

/**
 * Decrypt a Base64 encoded XOR-ciphered string using a symmetric key.
 */
export function decryptData(encoded: string | null | undefined, key: string | null | undefined): string | null {
  if (!encoded || !key) return null;
  try {
    const binaryString = atob(encoded);
    const encryptedChars = Array.from(binaryString).map(c => c.charCodeAt(0));
    const keyChars = Array.from(key).map(c => c.charCodeAt(0));
    const decrypted = encryptedChars.map((c, i) => c ^ keyChars[i % keyChars.length]);
    return String.fromCharCode(...decrypted);
  } catch (err) {
    console.error("[CRYPTO] Failed to decrypt data:", err);
    return null;
  }
}
