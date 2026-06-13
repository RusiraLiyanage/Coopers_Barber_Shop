import { createHash, randomUUID } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSession } from '@coopers/entities';
import type { Repository } from 'typeorm';
import {
  SESSION_IDLE_EXPIRED_CODE,
  type SessionValidationResponse,
} from './auth.types';

const DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS = 10 * 60;
const DEFAULT_SESSION_EXTENSION_GRACE_SECONDS = 5 * 60;
const SESSION_IDLE_EXPIRED_MESSAGE = 'Session expired due to inactivity';

type CreateAuthSessionInput = {
  userId: string;
  refreshToken: string;
  tokenFamilyId?: string;
};

export class SessionIdleExpiredException extends UnauthorizedException {
  constructor() {
    super({
      code: SESSION_IDLE_EXPIRED_CODE,
      message: SESSION_IDLE_EXPIRED_MESSAGE,
      canExtend: true,
    });
  }
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

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
      tokenFamilyId: input.tokenFamilyId ?? randomUUID(), // new login starts a new family; rotation reuses it
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

    if (await this.detectAndContainReuse(session)) {
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please login again.',
      );
    }

    if (this.isSessionExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionPastExtensionGrace(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    if (this.isSessionIdleExpired(session, now)) {
      throw new SessionIdleExpiredException();
    }

    return session;
  }

  async findExtendableSession(refreshToken: string): Promise<AuthSession> {
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

    if (await this.detectAndContainReuse(session)) {
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please login again.',
      );
    }

    if (this.isSessionExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionPastExtensionGrace(session, now)) {
      await this.revokeSessionById(session.id, now);
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    return session;
  }

  async markSessionUsed(sessionId: string): Promise<void> {
    await this.sessionsRepo.update(sessionId, {
      lastUsedAt: new Date(),
    });
  }

  async validateSessionStatus(
    sessionId: string,
  ): Promise<SessionValidationResponse> {
    const session = await this.sessionsRepo.findOne({
      where: {
        id: sessionId,
      },
    });

    const now = new Date();

    if (!session) {
      return {
        active: false,
      };
    }

    if (this.isSessionExpired(session, now)) {
      await this.revokeSessionById(session.id, now);
      return {
        active: false,
      };
    }

    if (this.isSessionPastExtensionGrace(session, now)) {
      await this.revokeSessionById(session.id, now);
      return {
        active: false,
      };
    }

    if (this.isSessionIdleExpired(session, now)) {
      return {
        active: false,
        code: SESSION_IDLE_EXPIRED_CODE,
        message: SESSION_IDLE_EXPIRED_MESSAGE,
        canExtend: true,
      };
    }

    await this.markSessionUsed(session.id);

    return {
      active: true,
    };
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const result = await this.validateSessionStatus(sessionId);

    return result.active;
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
    this.logger.log(`Revoked auth session ${session.id} by logout.`);
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
    const idleCutoff = new Date(
      now.getTime() -
        (this.getSessionIdleTimeoutMs() + this.getSessionExtensionGraceMs()),
    );
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

  async replaceSessionRefreshToken(
    currentSession: AuthSession,
    newRefreshToken: string,
  ): Promise<AuthSession> {
    await this.sessionsRepo.update(currentSession.id, {
      lastUsedAt: new Date(),
      revokedAt: new Date(),
    });

    return this.createSession({
      userId: currentSession.user.id,
      refreshToken: newRefreshToken,
      tokenFamilyId: currentSession.tokenFamilyId, // keep the rotated session in the same family
    });
  }

  async revokeSessionFamily(tokenFamilyId: string): Promise<void> {
    await this.sessionsRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
      })
      .where('token_family_id = :tokenFamilyId', { tokenFamilyId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  // A refresh token whose session is already revoked is being replayed. In normal
  // flows the guard's coordinator returns the rotated token, so the old one is
  // never re-presented — treat this as theft and revoke the whole family.
  private async detectAndContainReuse(session: AuthSession): Promise<boolean> {
    if (!session.revokedAt) {
      return false;
    }

    await this.revokeSessionFamily(session.tokenFamilyId);
    this.logger.warn(
      `Refresh token reuse detected for session ${session.id}; revoked family ${session.tokenFamilyId}.`,
    );

    return true;
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

  private isSessionPastExtensionGrace(
    session: AuthSession,
    now: Date,
  ): boolean {
    const lastActivityAt = session.lastUsedAt ?? session.createdAt;
    const idleForMs = now.getTime() - lastActivityAt.getTime();

    return (
      idleForMs >=
      this.getSessionIdleTimeoutMs() + this.getSessionExtensionGraceMs()
    );
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

  private getSessionExtensionGraceMs(): number {
    const configuredGraceSeconds = Number(
      this.configService.get<string>('SESSION_EXTENSION_GRACE_SECONDS') ??
        DEFAULT_SESSION_EXTENSION_GRACE_SECONDS,
    );

    const graceSeconds =
      Number.isFinite(configuredGraceSeconds) && configuredGraceSeconds > 0
        ? configuredGraceSeconds
        : DEFAULT_SESSION_EXTENSION_GRACE_SECONDS;

    return Math.floor(graceSeconds) * 1000;
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
