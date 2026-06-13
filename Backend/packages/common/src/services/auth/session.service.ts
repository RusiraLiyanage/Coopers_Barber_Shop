import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSession } from '@coopers/entities';
import type { Repository } from 'typeorm';

const DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS = 10 * 60;

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
    const now = new Date();
    const session = this.sessionsRepo.create({
      user: { id: input.userId },
      refreshTokenHash: this.hashRefreshToken(input.refreshToken),
      expiresAt: this.createRefreshTokenExpiresAt(), // expires in 14 days
      revokedAt: null,
      lastUsedAt: now,
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

    const now = new Date();

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionIdleExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Session expired due to inactivity');
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

    const now = new Date();

    if (!session) {
      return false;
    }

    if (this.isSessionExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      return false;
    }

    if (this.isSessionIdleExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      return false;
    }

    await this.markSessionUsed(session.id);

    return true;
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

  async revokeExpiredSessions(now = new Date()): Promise<number> {
    const idleCutoff = new Date(now.getTime() - this.getSessionIdleTimeoutMs());
    const result = await this.sessionsRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: now,
      })
      .where('revoked_at IS NULL')
      .andWhere(
        '(expires_at <= :now OR COALESCE(last_used_at, created_at) <= :idleCutoff)',
        {
          now,
          idleCutoff,
        },
      )
      .execute();

    return result.affected ?? 0;
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

  private isSessionExpired(session: AuthSession, now: Date): boolean {
    return Boolean(session.revokedAt || session.expiresAt <= now);
  }

  private isSessionIdleExpired(session: AuthSession, now: Date): boolean {
    const lastActivityAt = session.lastUsedAt ?? session.createdAt;
    const idleForMs = now.getTime() - lastActivityAt.getTime();

    return idleForMs >= this.getSessionIdleTimeoutMs();
  }

  private async revokeSessionById(
    sessionId: string,
    revokedAt = new Date(),
  ): Promise<void> {
    await this.sessionsRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt,
      })
      .where('id = :sessionId', { sessionId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private getSessionIdleTimeoutMs(): number {
    const configuredTimeoutSeconds = Number(
      this.configService.get<string>('SESSION_IDLE_TIMEOUT_SECONDS') ??
        DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS,
    );

    const timeoutSeconds =
      Number.isFinite(configuredTimeoutSeconds) && configuredTimeoutSeconds > 0
        ? configuredTimeoutSeconds
        : DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS;

    return Math.floor(timeoutSeconds) * 1000;
  }

  private createRefreshTokenExpiresAt(): Date {
    const configuredTtlDays =
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '14'; // based on the environment of the primary service.
    const ttlDays = Number(configuredTtlDays);
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + ttlDays); // adding the number of days to the date from current

    return expiresAt;
  }
}
