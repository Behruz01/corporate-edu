import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { requestContext } from './request-context';
import type { AuthenticatedRequest } from './types/authenticated-request';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    requestContext.run({ requestId: req.requestId }, () => next());
  }
}
