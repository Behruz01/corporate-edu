import { Body, Controller, Get, Param, Post, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { CreateSimulatorSessionDto } from './dto/create-session.dto';
import { SimulatorTurnDto } from './dto/simulator-turn.dto';
import { SimulatorService } from './simulator.service';

@Controller()
export class SimulatorController {
  constructor(private readonly simulator: SimulatorService) {}

  @Post('simulator/sessions')
  createSession(@Body() dto: CreateSimulatorSessionDto, @CurrentUser() user: AuthPrincipal): Promise<{ sessionId: string }> {
    return this.simulator.createSession(dto, user);
  }

  @Post('simulator/sessions/:id/turn')
  @Sse()
  turn(
    @Param('id') id: string,
    @Body() dto: SimulatorTurnDto,
    @CurrentUser() user: AuthPrincipal,
  ): Observable<MessageEvent> {
    return this.simulator.turnStream(id, dto, user);
  }

  @Post('simulator/sessions/:id/end')
  end(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.simulator.endSession(id, user);
  }

  @Get('simulator/sessions/:id')
  getSession(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.simulator.getSession(id, user);
  }

  @Get('simulator/sessions/:id/score')
  getScore(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.simulator.getScore(id, user);
  }

  @Get('me/simulator/history')
  history(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.simulator.history(user);
  }
}
