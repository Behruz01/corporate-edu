import {
  Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { UpdateLangDto } from './dto/update-lang.dto';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import type { Lang } from '@corpmind/shared';

const REFRESH_COOKIE = 'cm_refresh';
const ACCESS_COOKIE = 'cm_access';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ user: unknown; accessToken: string }> {
    const result = await this.auth.login(dto.email, dto.password);
    this.setCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    const raw = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? '';
    const result = await this.auth.refresh(raw);
    this.setCookies(res, result.accessToken, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.auth.logout(raw);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.auth.getMe(user.userId);
  }

  @UseGuards(JwtGuard)
  @Patch('me/lang')
  async updateLang(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateLangDto): Promise<{ ok: true }> {
    await this.auth.updateLang(user.userId, dto.lang as Lang);
    return { ok: true };
  }

  private setCookies(res: Response, access: string, refresh: string, refreshExpiresAt: Date): void {
    const common = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
    res.cookie(ACCESS_COOKIE, access, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refresh, { ...common, expires: refreshExpiresAt });
  }
}
