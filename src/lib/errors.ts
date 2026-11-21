export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, "FORBIDDEN", 403);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}
export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, "CONFLICT", 409, details);
  }
}
export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, "RATE_LIMITED", 429);
  }
}
export class ExternalServiceError extends AppError {
  constructor(message = "External service error", details?: unknown) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, details);
  }
}
export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
