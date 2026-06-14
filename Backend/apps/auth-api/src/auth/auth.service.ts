import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthSession,
  OAuthIdentity,
  OAuthProvider,
  PasswordResetToken,
  User,
  UserRole,
} from '@coopers/entities';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import {
  AuthenticatedUser,
  AuthTokensResponse,
  EmailService,
  JwtTokenService,
  LogoutResponse,
  PasswordService,
  SessionService,
  SessionValidationResponse,
} from '@coopers/common';
import { UpdateAccountDto } from './dto/update-account.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { CompleteGoogleOAuthDto } from './dto/complete-google-oauth.dto';
import { LinkGoogleOAuthDto } from './dto/link-google-oauth.dto';
import { OAuthLinkTicketService } from './oauth-link-ticket.service';
import { ConfigService } from '@nestjs/config';
import { IsNull, type Repository } from 'typeorm';

export type AccountProfileResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  suburb: string | null;
  role: UserRole;
};

export type PasswordResetRequestResponse = {
  success: true;
};

export type PasswordResetVerificationResponse = {
  valid: true;
};

export type PasswordResetConfirmResponse = {
  success: true;
};

// A first-time Google login either authenticates straight away (new user or an
// already-linked identity) or, when the email already belongs to a local
// account, asks the caller to confirm ownership with a password before linking.
export type GoogleOAuthCompletionResult =
  | { status: 'authenticated'; tokens: AuthTokensResponse }
  | { status: 'link_required'; linkTicket: string };

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 10;
const DEFAULT_PASSWORD_RESET_MAX_ATTEMPTS = 5;

function toAccountProfile(user: User): AccountProfileResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mobile: user.mobile,
    suburb: user.suburb,
    role: user.role,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokensRepo: Repository<PasswordResetToken>,
    @InjectRepository(OAuthIdentity)
    private readonly oauthIdentitiesRepo: Repository<OAuthIdentity>,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly oauthLinkTicketService: OAuthLinkTicketService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async login(user: AuthenticatedUser): Promise<AuthTokensResponse> {
    return this.createSessionTokens(user);
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      suburb: dto.suburb,
      role: UserRole.CUSTOMER,
    });

    return this.login({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async completeGoogleOAuthLogin(
    dto: CompleteGoogleOAuthDto,
  ): Promise<GoogleOAuthCompletionResult> {
    if (dto.emailVerified !== true) {
      throw new UnauthorizedException('Google email address is not verified.');
    }

    const email = this.normalizeEmail(dto.email);
    const providerUserId = dto.providerUserId.trim();

    if (!providerUserId) {
      throw new UnauthorizedException('Invalid Google identity.');
    }

    const existingIdentity = await this.oauthIdentitiesRepo.findOne({
      where: {
        provider: OAuthProvider.GOOGLE,
        providerUserId,
      },
      relations: {
        user: true,
      },
    });

    if (existingIdentity) {
      await this.syncIdentityEmail(existingIdentity, email);

      return this.authenticated(existingIdentity.user);
    }

    const existingUser = await this.usersService.findByEmail(email);

    // Pre-account-hijacking guard: registration does not verify email, so a
    // local account with this address may have been created by someone who
    // never proved they own it. Require the user to confirm ownership with
    // their password (handled by linkGoogleOAuthIdentity) before linking,
    // rather than silently merging the verified Google identity into it.
    if (existingUser) {
      return {
        status: 'link_required',
        linkTicket: this.oauthLinkTicketService.sign({
          provider: OAuthProvider.GOOGLE,
          providerUserId,
          email,
          userId: existingUser.id,
        }),
      };
    }

    const user = await this.usersService.create({
      email,
      passwordHash: await this.createOAuthOnlyPasswordHash(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.CUSTOMER,
    });

    await this.linkGoogleIdentity(user, providerUserId, email);

    return this.authenticated(user);
  }

  async linkGoogleOAuthIdentity(
    dto: LinkGoogleOAuthDto,
  ): Promise<AuthTokensResponse> {
    const claims = this.oauthLinkTicketService.verify(dto.linkTicket);
    const user = await this.usersService.findById(claims.userId);

    if (!user || this.normalizeEmail(user.email) !== claims.email) {
      throw new UnauthorizedException(
        'Google link request is no longer valid.',
      );
    }

    const isPasswordValid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password.');
    }

    await this.linkGoogleIdentity(user, claims.providerUserId, claims.email);

    return this.createSessionTokens(this.toAuthenticatedUser(user));
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const currentSession =
      await this.sessionService.findActiveSession(refreshToken);

    return this.createRotatedSessionTokens(currentSession, 'refreshed');
  }

  async extend(refreshToken: string): Promise<AuthTokensResponse> {
    const currentSession =
      await this.sessionService.findExtendableSession(refreshToken);

    return this.createRotatedSessionTokens(currentSession, 'extended');
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    await this.sessionService.revokeSession(refreshToken);

    return {
      success: true,
    };
  }

  async validateSession(sessionId: string): Promise<SessionValidationResponse> {
    return this.sessionService.validateSessionStatus(sessionId);
  }

  async getAccountProfile(userId: string): Promise<AccountProfileResponse> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User account was not found');
    }

    return toAccountProfile(user);
  }

  async updateAccountProfile(
    userId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountProfileResponse> {
    const user = await this.usersService.updateAccount(userId, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      suburb: dto.suburb,
    });

    return toAccountProfile(user);
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<PasswordResetRequestResponse> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { success: true };
    }

    await this.expireOpenPasswordResetTokens(email);

    const resetCode = this.generateResetCode();
    const resetToken = this.passwordResetTokensRepo.create({
      user: { id: user.id },
      email,
      codeHash: await this.passwordService.hash(this.hashResetCode(resetCode)),
      expiresAt: this.createPasswordResetExpiresAt(),
      usedAt: null,
      attemptCount: 0,
    });

    await this.passwordResetTokensRepo.save(resetToken);
    await this.emailService.sendForgotPasswordEmail({
      to: email,
      resetCode,
      expiresInMinutes: this.getPasswordResetTtlMinutes(),
      firstName: user.firstName,
    });

    return { success: true };
  }

  async verifyPasswordResetCode(
    dto: VerifyPasswordResetCodeDto,
  ): Promise<PasswordResetVerificationResponse> {
    await this.findVerifiedPasswordResetToken(dto);

    return { valid: true };
  }

  async confirmPasswordReset(
    dto: ConfirmPasswordResetDto,
  ): Promise<PasswordResetConfirmResponse> {
    const resetToken = await this.findVerifiedPasswordResetToken(dto);
    const passwordHash = await this.passwordService.hash(dto.password);

    await this.usersService.updatePassword(resetToken.user.id, passwordHash);

    resetToken.usedAt = new Date();
    await this.passwordResetTokensRepo.save(resetToken);
    await this.sessionService.revokeUserSessions(resetToken.user.id);

    return { success: true };
  }

  private async createSessionTokens(
    user: AuthenticatedUser,
  ): Promise<AuthTokensResponse> {
    const refreshToken = this.jwtTokenService.generateRefreshToken();

    const session = await this.sessionService.createSession({
      userId: user.id,
      refreshToken: refreshToken.refresh_token,
    });

    return {
      ...this.jwtTokenService.signAccessToken(user, session.id),
      ...refreshToken,
    };
  }

  private async createRotatedSessionTokens(
    currentSession: AuthSession,
    action: 'refreshed' | 'extended',
  ): Promise<AuthTokensResponse> {
    const refreshToken = this.jwtTokenService.generateRefreshToken();
    const newSession = await this.sessionService.replaceSessionRefreshToken(
      currentSession,
      refreshToken.refresh_token,
    );

    this.logger.log(
      `Auth session ${action}: ${currentSession.id} -> ${newSession.id} for user ${currentSession.user.id}.`,
    );

    return {
      ...this.jwtTokenService.signAccessToken(
        this.toAuthenticatedUser(currentSession.user),
        newSession.id,
      ),
      ...refreshToken,
    };
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async authenticated(
    user: User,
  ): Promise<GoogleOAuthCompletionResult> {
    return {
      status: 'authenticated',
      tokens: await this.createSessionTokens(this.toAuthenticatedUser(user)),
    };
  }

  private async syncIdentityEmail(
    identity: OAuthIdentity,
    email: string,
  ): Promise<void> {
    if (identity.email === email && identity.emailVerified) {
      return;
    }

    identity.email = email;
    identity.emailVerified = true;
    await this.oauthIdentitiesRepo.save(identity);
  }

  private async linkGoogleIdentity(
    user: User,
    providerUserId: string,
    email: string,
  ): Promise<void> {
    await this.ensureUserDoesNotHaveGoogleIdentity(user.id);
    await this.oauthIdentitiesRepo.save(
      this.oauthIdentitiesRepo.create({
        provider: OAuthProvider.GOOGLE,
        providerUserId,
        email,
        emailVerified: true,
        user,
        userId: user.id,
      }),
    );
  }

  private async ensureUserDoesNotHaveGoogleIdentity(
    userId: string,
  ): Promise<void> {
    const existingUserIdentity = await this.oauthIdentitiesRepo.findOne({
      where: {
        userId,
        provider: OAuthProvider.GOOGLE,
      },
    });

    if (existingUserIdentity) {
      throw new ConflictException('User already has a linked Google account.');
    }
  }

  private createOAuthOnlyPasswordHash(): Promise<string> {
    return this.passwordService.hash(
      `oauth:${randomBytes(32).toString('hex')}`,
    );
  }

  private async findVerifiedPasswordResetToken(
    dto: VerifyPasswordResetCodeDto,
  ): Promise<PasswordResetToken> {
    const email = this.normalizeEmail(dto.email);
    const resetToken = await this.passwordResetTokensRepo.findOne({
      where: {
        email,
        usedAt: IsNull(),
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!resetToken || resetToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    if (resetToken.attemptCount >= this.getPasswordResetMaxAttempts()) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    const isCodeValid = await this.passwordService.compare(
      this.hashResetCode(dto.code),
      resetToken.codeHash,
    );

    if (!isCodeValid) {
      resetToken.attemptCount += 1;
      await this.passwordResetTokensRepo.save(resetToken);
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    return resetToken;
  }

  private async expireOpenPasswordResetTokens(email: string): Promise<void> {
    await this.passwordResetTokensRepo.update(
      {
        email,
        usedAt: IsNull(),
      },
      {
        usedAt: new Date(),
      },
    );
  }

  private generateResetCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashResetCode(resetCode: string): string {
    return createHash('sha256').update(resetCode.trim()).digest('hex');
  }

  private createPasswordResetExpiresAt(): Date {
    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.getPasswordResetTtlMinutes(),
    );

    return expiresAt;
  }

  private getPasswordResetTtlMinutes(): number {
    const ttl = Number(
      this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES') ??
        DEFAULT_PASSWORD_RESET_TTL_MINUTES,
    );

    return Number.isFinite(ttl) && ttl > 0
      ? ttl
      : DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  }

  private getPasswordResetMaxAttempts(): number {
    const maxAttempts = Number(
      this.configService.get<string>('PASSWORD_RESET_MAX_ATTEMPTS') ??
        DEFAULT_PASSWORD_RESET_MAX_ATTEMPTS,
    );

    return Number.isInteger(maxAttempts) && maxAttempts > 0
      ? maxAttempts
      : DEFAULT_PASSWORD_RESET_MAX_ATTEMPTS;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
