import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSession } from '@coopers/entities';
import type { Repository } from 'typeorm';

type CreateAuthSessionInput = {
  userId: string;
  refreshToken: string;
};

type RotateAuthSessionInput = {
  currentRefreshToken: string;
  newRefreshToken: string;
};

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly sessionsRepo: Repository<AuthSession>,
    private readonly configService: ConfigService,
  ) {}

  async createSession(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session = this.sessionsRepo.create({
      user: { id: input.userId },
      refreshTokenHash: this.hashRefreshToken(input.refreshToken),
      expiresAt: this.createRefreshTokenExpiresAt(),
      revokedAt: null,
      lastUsedAt: null,
    });

    return this.sessionsRepo.save(session);
  }

  async findActiveSession(refreshToken: string): Promise<AuthSession> {
    const session = await this.sessionsRepo.findOne({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
      },
      relations: {
        user: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return session;
  }

  async markSessionUsed(sessionId: string): Promise<void> {
    await this.sessionsRepo.update(sessionId, {
      lastUsedAt: new Date(),
    });
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.sessionsRepo.findOne({
      where: {
        id: sessionId,
      },
    });

    return Boolean(
      session && !session.revokedAt && session.expiresAt > new Date(),
    );
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const session = await this.sessionsRepo.findOne({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
      },
    });

    if (!session || session.revokedAt) {
      return;
    }

    session.revokedAt = new Date();
    await this.sessionsRepo.save(session);
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.sessionsRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
      })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async rotateSession(input: RotateAuthSessionInput): Promise<AuthSession> {
    const currentSession = await this.findActiveSession(
      input.currentRefreshToken,
    );

    await this.sessionsRepo.update(currentSession.id, {
      lastUsedAt: new Date(),
      revokedAt: new Date(),
    });

    return this.createSession({
      userId: currentSession.user.id,
      refreshToken: input.newRefreshToken,
    });
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private createRefreshTokenExpiresAt(): Date {
    const configuredTtlDays =
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '14';
    const ttlDays = Number(configuredTtlDays);
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    return expiresAt;
  }
}
