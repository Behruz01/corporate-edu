import { BadRequestException, Body, Controller, Logger, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { VoiceService } from './voice.service';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        originalname: string;
        mimetype: string;
        buffer: Buffer;
        size: number;
      }
    }
  }
}

@Controller('voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voice: VoiceService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('lang') lang: string | undefined,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<{ text: string }> {
    if (!file) throw new BadRequestException('Audio file is required');
    this.logger.log(`Transcribing audio for user=${user.userId} bytes=${file.size} filename=${file.originalname}`);
    return this.voice.transcribe(file.buffer, file.originalname, lang);
  }
}
