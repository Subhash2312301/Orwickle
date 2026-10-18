import argon2 from 'argon2';
import { withArgon2Semaphore } from './argon2-semaphore';

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB (RFC 9106 recommended interactive parameters)
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
  hashLength: 32,    // 32 bytes
};

let precomputedDummyHash: string | null = null;

/**
 * Initializes the static dummy hash at boot so that any timing attack against
 * non-existent emails incurs the identical Argon2id compute time as existing users.
 */
export async function initializeDummyHash(): Promise<string> {
  if (!precomputedDummyHash) {
    const dummyPassword = 'Orwickle_Dummy_Timing_Safe_Password_2026!';
    precomputedDummyHash = await withArgon2Semaphore(() =>
      argon2.hash(dummyPassword, ARGON2_OPTIONS)
    );
  }
  return precomputedDummyHash;
}

export function getDummyHash(): string {
  if (!precomputedDummyHash) {
    throw new Error('Dummy hash has not been initialized. Call initializeDummyHash() during boot.');
  }
  return precomputedDummyHash;
}

/**
 * Hashes a plaintext password using Argon2id guarded by the concurrency semaphore.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return withArgon2Semaphore(() => argon2.hash(plainPassword, ARGON2_OPTIONS));
}

/**
 * Verifies a candidate password against a hash guarded by the concurrency semaphore.
 */
export async function verifyPassword(storedHash: string, candidatePassword: string): Promise<boolean> {
  return withArgon2Semaphore(() => argon2.verify(storedHash, candidatePassword, ARGON2_OPTIONS));
}

/**
 * Verifies a candidate password against the static dummy hash in constant time.
 */
export async function verifyDummyHash(candidatePassword: string): Promise<boolean> {
  try {
    const dummyHash = getDummyHash();
    await verifyPassword(dummyHash, candidatePassword);
  } catch {
    // Ignore verification errors; result is always false
  }
  return false;
}

/**
 * Checks whether an existing Argon2 hash needs to be upgraded to current cost parameters (ADR-012).
 * If true, returns the freshly computed hash; otherwise returns null.
 */
export async function checkAndRehashPassword(
  storedHash: string,
  plainPassword: string
): Promise<string | null> {
  const needsUpgrade = argon2.needsRehash(storedHash, ARGON2_OPTIONS);
  if (needsUpgrade) {
    return await hashPassword(plainPassword);
  }
  return null;
}
