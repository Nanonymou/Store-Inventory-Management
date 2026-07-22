import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

/**
 * Password hashing using Node's scrypt (no native deps). Stored format:
 * `scrypt$<salt-hex>$<hash-hex>`. Server-side only.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

/** Verify a plaintext password against a stored scrypt hash (constant-time). */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const hashBuf = Buffer.from(hash, "hex");
  const derived = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

/**
 * Password policy: at least 8 characters, containing both a letter and a digit
 * (PRD §8.3). Returns an error message or null if valid.
 */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "Password minimal 8 karakter.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password harus mengandung huruf dan angka.";
  }
  return null;
}
