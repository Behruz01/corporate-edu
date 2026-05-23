import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from './storage.service';

@Controller('files')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('*')
  async serve(@Param('0') key: string, @Res() res: Response): Promise<void> {
    const exists = await this.storage.exists(key);
    if (!exists) throw new NotFoundException();
    res.setHeader('Cache-Control', 'private, max-age=300');
    this.storage.streamFile(key).pipe(res);
  }
}
