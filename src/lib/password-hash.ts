/**
 * Password Hashing Utilities
 * Uses bcrypt with cost factor 12 for secure password storage
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcrypt
 * @param plainPassword - The plain-text password to hash
 * @returns Promise resolving to the bcrypt hash string
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a bcrypt hash
 * Uses constant-time comparison to prevent timing attacks
 * @param plainPassword - The plain-text password to verify
 * @param hashedPassword - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
