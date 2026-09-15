import type { Request, Response, NextFunction } from 'express';

/**
 * Parses and validates the runtime port.
 * Valid range: 1–65535.
 * Falls back safely to 3000 if invalid, missing, or out of range.
 */
export function resolveServerPort(envPort: string | undefined): number {
  if (!envPort) return 3000;
  const parsed = parseInt(envPort, 10);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    return parsed;
  }
  return 3000;
}

/**
 * Standard minimal security headers middleware without external dependencies.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict origin referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent framing from external untrusted sites
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Limit sensitive device permissions to self origin
  res.setHeader('Permissions-Policy', 'camera=(self)');

  next();
}

/**
 * Safe error handling middleware for JSON parse and other uncaught errors.
 * Guarantees no stack trace, path, or sensitive data leakage in production.
 */
export function apiErrorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({
      error: 'Payload Too Large',
      message: 'Kích thước dữ liệu yêu cầu vượt quá giới hạn cho phép (16kb).',
    });
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Dữ liệu JSON không hợp lệ.',
    });
    return;
  }

  res.status(err?.status || 500).json({
    error: 'Internal Server Error',
    message: 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu.',
  });
}
