import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/app-error';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
  sid: string; // Stable session ID
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'orwickle-dealroom',
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader !== 'object') {
      throw new UnauthorizedError('ERROR — Malformed access token structure.');
    }

    if (decodedHeader.header.alg !== 'HS256') {
      throw new UnauthorizedError(
        'ERROR — Invalid token signing algorithm. Only HS256 is accepted.'
      );
    }

    const verifyOptions: VerifyOptions = {
      algorithms: ['HS256'],
      issuer: 'orwickle-dealroom',
    };

    const verified = jwt.verify(token, env.JWT_SECRET, verifyOptions);
    return verified as AccessTokenPayload;
  } catch (err: any) {
    if (err instanceof UnauthorizedError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('ERROR — Access token has expired. Please refresh your session.');
    }
    throw new UnauthorizedError('ERROR — Invalid or unverified access token signature.');
  }
}

export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
