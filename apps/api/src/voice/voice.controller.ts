import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { VoiceService } from './voice.service';

class SpeakDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

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

  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('lang') lang: string | undefined,
    @CurrentUser() user: AuthPrincipal,
  ): Promise<{ text: string }> {
    if (!file) throw new BadRequestException('Audio file is required');
    this.logger.log(`Transcribing audio for user=${user.userId} bytes=${file.size} filename=${file.originalname}`);
    return this.voiceService.transcribe(file.buffer, file.originalname, lang);
  }

  @Post('speak')
  @HttpCode(200)
  async speak(@Body() dto: SpeakDto, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = await this.voiceService.synthesize(dto.text);
    return new StreamableFile(buffer);
  }
}
