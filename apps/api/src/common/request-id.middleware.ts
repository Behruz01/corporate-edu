import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { v4 as uuid } from 'uuid';
import type { AuthenticatedRequest } from './types/authenticated-request';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= 64 ? incoming : uuid();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
