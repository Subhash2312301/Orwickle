import argon2 from 'argon2';

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
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
    precomputedDummyHash = await argon2.hash(dummyPassword, ARGON2_OPTIONS);
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
 * Verifies a candidate password against the static dummy hash in constant time.
 */
export async function verifyDummyHash(candidatePassword: string): Promise<boolean> {
  try {
    const dummyHash = getDummyHash();
    await argon2.verify(dummyHash, candidatePassword, ARGON2_OPTIONS);
  } catch {
    // Ignore verification errors; result is always false
  }
  return false;
}
