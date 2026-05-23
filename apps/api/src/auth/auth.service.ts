import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { loadEnv } from '../config/env';
import { verifyPassword } from './password';
import type { AuthUser, Role, Lang, UserStatus } from '@corpmind/shared';
import type { JwtPayload } from './jwt.strategy';

const REFRESH_TOKEN_BYTES = 48;

type LoginResult = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || user.status === 'INACTIVE') throw new UnauthorizedException('Invalid credentials');
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.tenantId, user.role as Role, user.email, {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      status: user.status as UserStatus,
      preferredLang: user.preferredLang as Lang,
      pointsTotal: user.pointsTotal,
    });
  }

  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date }> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');
    const hashed = this.hashRefresh(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.status === 'INACTIVE') throw new UnauthorizedException('User not active');

    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const { accessToken, refreshToken, refreshExpiresAt } = await this.issueTokens(
      user.id, user.tenantId, user.role as Role, user.email,
    );
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hashed = this.hashRefresh(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { hashedToken: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      status: user.status as UserStatus,
      preferredLang: user.preferredLang as Lang,
      pointsTotal: user.pointsTotal,
    };
  }

  async updateLang(userId: string, lang: Lang): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { preferredLang: lang } });
  }

  private async issueTokens(
    userId: string,
    tenantId: string,
    role: Role,
    email: string,
    userPayload?: AuthUser,
  ): Promise<LoginResult> {
    const env = loadEnv();
    const payload: JwtPayload = { sub: userId, tid: tenantId, role, email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    });

    const rawRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const hashed = this.hashRefresh(rawRefresh);
    const refreshExpiresAt = new Date(Date.now() + this.ttlToMs(env.JWT_REFRESH_TTL));
    await this.prisma.refreshToken.create({
      data: { userId, hashedToken: hashed, expiresAt: refreshExpiresAt },
    });

    return {
      user:
        userPayload ?? {
          id: userId,
          tenantId,
          email,
          fullName: '',
          role,
          status: 'ACTIVE',
          preferredLang: 'UZ',
          pointsTotal: 0,
        },
      accessToken,
      refreshToken: rawRefresh,
      refreshExpiresAt,
    };
  }

  private hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private ttlToMs(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 30 * 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default:  return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
