import { BadRequestError } from '../errors/app-error';

// Top common weak passwords blocklist (ADR-010)
const COMMON_PASSWORDS = new Set([
  'password123',
  'password1234',
  '1234567890',
  '12345678901',
  'qwertyuiop',
  'admin12345',
  'administrator',
  'welcome1234',
  'welcome12345',
  'orwickle2026',
  'szabist1234',
  'changeme123',
  'iloveyou123',
  'trustnoone1',
  'letmein1234',
  'monkey12345',
  'dragon12345',
  'football123',
  'master12345',
  'sunshine123',
  'princess123',
  'computer123',
]);

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates a password according to Orwickle Policy (ADR-010):
 * - Minimum 10 characters
 * - Maximum 128 characters
 * - Evaluated against common-password blocklist
 * - Composition rules (uppercase, lowercase, numbers, symbols) are optional/recommended.
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new BadRequestError('Password must be provided.', 'WEAK_PASSWORD');
  }

  if (password.length < 10) {
    throw new BadRequestError('Password must be at least 10 characters long.', 'WEAK_PASSWORD');
  }

  if (password.length > 128) {
    throw new BadRequestError('Password must not exceed 128 characters.', 'WEAK_PASSWORD');
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    throw new BadRequestError(
      'Password is too common and easily guessed. Please select a more complex phrase.',
      'WEAK_PASSWORD'
    );
  }

  // Check trivial sequential patterns
  if (/^(0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(lower)) {
    throw new BadRequestError(
      'Password contains sequential or keyboard walk patterns.',
      'WEAK_PASSWORD'
    );
  }
}
