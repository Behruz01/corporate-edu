import { Body, Controller, Get, Param, Post, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { AskKbDto } from './dto/ask-kb.dto';
import { RateMessageDto } from './dto/rate-message.dto';
import { KbService } from './kb.service';

@Controller('kb')
export class KbController {
  constructor(private readonly kb: KbService) {}

  @Post('ask')
  @Sse()
  ask(@Body() dto: AskKbDto, @CurrentUser() user: AuthPrincipal): Observable<MessageEvent> {
    return this.kb.askStream(dto, user);
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.kb.conversations(user);
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.kb.messages(id, user);
  }

  @Post('messages/:id/rate')
  rate(@Param('id') id: string, @Body() dto: RateMessageDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.kb.rateMessage(id, dto.rating, user);
  }
}
