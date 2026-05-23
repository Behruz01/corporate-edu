import { ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './types/authenticated-request';

type ProblemDetails = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<AuthenticatedRequest>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        message = (r['message'] as string) ?? exception.message;
        code = (r['error'] as string) ?? defaultCodeFor(status);
        details = r['details'];
      }
      code = (code || defaultCodeFor(status)).toString();
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack ?? message);
    }

    const body: ProblemDetails = {
      statusCode: status,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId: req.requestId,
    };
    res.status(status).json(body);
  }
}

function defaultCodeFor(status: number): string {
  switch (status) {
    case 400: return 'bad_request';
    case 401: return 'unauthorized';
    case 403: return 'forbidden';
    case 404: return 'not_found';
    case 409: return 'conflict';
    case 422: return 'unprocessable_entity';
    case 429: return 'rate_limited';
    default:  return status >= 500 ? 'internal_error' : 'error';
  }
}
