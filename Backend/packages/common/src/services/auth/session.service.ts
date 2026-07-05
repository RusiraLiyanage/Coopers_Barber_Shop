import { createHash, randomUUID } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthSession } from '@coopers/entities';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { getRequiredConfigInteger } from '../../configs/env.util';
import {
  SESSION_EXPIRED_CODE,
  SESSION_IDLE_EXPIRED_CODE,
  type SessionValidationResponse,
} from './auth.types';

const SESSION_EXPIRED_MESSAGE = 'Session expired. Please login again.';
const SESSION_IDLE_EXPIRED_MESSAGE = 'Session expired due to inactivity';
const REFRESH_TOKEN_ROTATION_GRACE_SECONDS = 60;

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
    private readonly dataSource: DataSource,
  ) {}

  async createSession(
    input: CreateAuthSessionInput,
    manager?: EntityManager,
  ): Promise<AuthSession> {
    const sessionsRepo =
      manager?.getRepository(AuthSession) ?? this.sessionsRepo;
    const now = new Date();
    const session = sessionsRepo.create({
      user: { id: input.userId },
      refreshTokenHash: this.hashRefreshToken(input.refreshToken),
      tokenFamilyId: input.tokenFamilyId ?? randomUUID(), // new login starts a new family; rotation reuses it
      expiresAt: this.createRefreshTokenExpiresAt(), // expires in 14 days
      revokedAt: null,
      lastUsedAt: now,
    });

    return sessionsRepo.save(session);
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

    const resolvedSession = await this.resolveRecentlyRotatedSession(
      session,
      now,
    );

    if (!resolvedSession) {
      await this.containRefreshTokenReuse(session);
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please login again.',
      );
    }

    if (this.isSessionExpired(resolvedSession, now)) {
      await this.revokeSessionById(resolvedSession.id, now);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionPastExtensionGrace(resolvedSession, now)) {
      await this.revokeSessionById(resolvedSession.id, now);
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: SESSION_EXPIRED_MESSAGE,
        canExtend: false,
      });
    }

    if (this.isSessionIdleExpired(resolvedSession, now)) {
      throw new SessionIdleExpiredException();
    }

    return resolvedSession;
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

    const resolvedSession = await this.resolveRecentlyRotatedSession(
      session,
      now,
    );

    if (!resolvedSession) {
      await this.containRefreshTokenReuse(session);
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please login again.',
      );
    }

    if (this.isSessionExpired(resolvedSession, now)) {
      await this.revokeSessionById(resolvedSession.id, now);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (this.isSessionPastExtensionGrace(resolvedSession, now)) {
      await this.revokeSessionById(resolvedSession.id, now);
      throw new UnauthorizedException({
        code: SESSION_EXPIRED_CODE,
        message: SESSION_EXPIRED_MESSAGE,
        canExtend: false,
      });
    }

    return resolvedSession;
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
        code: SESSION_EXPIRED_CODE,
        message: SESSION_EXPIRED_MESSAGE,
        canExtend: false,
      };
    }

    if (this.isSessionPastExtensionGrace(session, now)) {
      await this.revokeSessionById(session.id, now);
      return {
        active: false,
        code: SESSION_EXPIRED_CODE,
        message: SESSION_EXPIRED_MESSAGE,
        canExtend: false,
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

  async revokeUserSessions(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const sessionsRepo =
      manager?.getRepository(AuthSession) ?? this.sessionsRepo;

    await sessionsRepo
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        revokedAt: new Date(),
      })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async hasActiveUserSession(
    userId: string,
    now = new Date(),
  ): Promise<boolean> {
    const idleCutoff = new Date(
      now.getTime() -
        (this.getSessionIdleTimeoutMs() + this.getSessionExtensionGraceMs()),
    );
    const count = await this.sessionsRepo
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now })
      .andWhere(
        'COALESCE(session.last_used_at, session.created_at) > :idleCutoff',
        {
          idleCutoff,
        },
      )
      .getCount();

    return count > 0;
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
    return this.dataSource.transaction(async (manager) => {
      const sessionsRepo = manager.getRepository(AuthSession);

      await sessionsRepo.update(currentSession.id, {
        lastUsedAt: new Date(),
        revokedAt: new Date(),
      });

      return this.createSession(
        {
          userId: currentSession.user.id,
          refreshToken: newRefreshToken,
          tokenFamilyId: currentSession.tokenFamilyId, // keep the rotated session in the same family
        },
        manager,
      );
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

  // A revoked refresh token can briefly reappear when browser requests race while
  // cookies are being rotated. Reuse outside this small window is treated as a
  // replay and the token family is revoked.
  private async resolveRecentlyRotatedSession(
    session: AuthSession,
    now: Date,
  ): Promise<AuthSession | null> {
    if (!session.revokedAt) {
      return session;
    }

    const rotatedForMs = now.getTime() - session.revokedAt.getTime();

    if (rotatedForMs > REFRESH_TOKEN_ROTATION_GRACE_SECONDS * 1000) {
      return null;
    }

    const successor = await this.sessionsRepo.findOne({
      where: {
        tokenFamilyId: session.tokenFamilyId,
        revokedAt: null,
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return successor ?? null;
  }

  private async containRefreshTokenReuse(session: AuthSession): Promise<void> {
    await this.revokeSessionFamily(session.tokenFamilyId);
    this.logger.warn(
      `Refresh token reuse detected for session ${session.id}; revoked family ${session.tokenFamilyId}.`,
    );
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
    return (
      getRequiredConfigInteger(
        this.configService,
        'SESSION_IDLE_TIMEOUT_SECONDS',
      ) * 1000
    );
  }

  private getSessionExtensionGraceMs(): number {
    return (
      getRequiredConfigInteger(
        this.configService,
        'SESSION_EXTENSION_GRACE_SECONDS',
      ) * 1000
    );
  }

  private createRefreshTokenExpiresAt(): Date {
    const ttlDays = getRequiredConfigInteger(
      this.configService,
      'REFRESH_TOKEN_TTL_DAYS',
    );
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + ttlDays); // adding the number of days to the date from current

    return expiresAt;
  }
}
