export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    const prefixedMessage = message.startsWith('ERROR —') ? message : `ERROR — ${message}`;
    super(prefixedMessage);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters.', code = 'BAD_REQUEST', details?: any) {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.', code = 'UNAUTHORIZED', details?: any) {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied for the requested resource.', code = 'FORBIDDEN', details?: any) {
    super(message, 403, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found.', code = 'NOT_FOUND', details?: any) {
    super(message, 404, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict with current resource state.', code = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Rate limit exceeded. Please try again later.', code = 'RATE_LIMIT_EXCEEDED', details?: any) {
    super(message, 429, code, details);
  }
}

export class LockedError extends AppError {
  constructor(message = 'Account is temporarily locked due to repeated authentication failures.', code = 'ACCOUNT_LOCKED', details?: any) {
    super(message, 423, code, details);
  }
}

