import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthenticatedRequest,
  AuthTokensResponse,
  JwtAuthenticatedRequest,
  LogoutResponse,
  SessionValidationResponse,
} from '@coopers/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SessionValidationDto } from './dto/session-validation.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountProfileResponse } from './auth.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyPasswordResetCodeDto } from './dto/verify-password-reset-code.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { CompleteGoogleOAuthDto } from './dto/complete-google-oauth.dto';
import { LinkGoogleOAuthDto } from './dto/link-google-oauth.dto';
import type {
  GoogleOAuthCompletionResult,
  PasswordResetConfirmResponse,
  PasswordResetRequestResponse,
  PasswordResetVerificationResponse,
} from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: AuthenticatedRequest): Promise<AuthTokensResponse> {
    return this.authService.login(req.user);
  }

  @ApiOperation({ summary: 'Register a new customer account' })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokensResponse> {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Complete Google OAuth login from the booking guard',
  })
  @ApiBody({ type: CompleteGoogleOAuthDto })
  @HttpCode(200)
  @Post('oauth/google/complete')
  completeGoogleOAuthLogin(
    @Body() dto: CompleteGoogleOAuthDto,
  ): Promise<GoogleOAuthCompletionResult> {
    return this.authService.completeGoogleOAuthLogin(dto);
  }

  @ApiOperation({
    summary:
      'Link a Google identity to an existing account after password check',
  })
  @ApiBody({ type: LinkGoogleOAuthDto })
  @HttpCode(200)
  @Post('oauth/google/link')
  linkGoogleOAuthIdentity(
    @Body() dto: LinkGoogleOAuthDto,
  ): Promise<AuthTokensResponse> {
    return this.authService.linkGoogleOAuthIdentity(dto);
  }

  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.authService.refresh(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Extend an idle auth session during grace period' })
  @Post('extend')
  extend(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.authService.extend(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Logout and revoke the refresh token session' })
  @Post('logout')
  logout(@Body() dto: LogoutDto): Promise<LogoutResponse> {
    return this.authService.logout(dto.refresh_token);
  }

  @ApiOperation({ summary: 'Request a password reset verification code' })
  @ApiBody({ type: RequestPasswordResetDto })
  @HttpCode(200)
  @Post('password-reset/request')
  requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<PasswordResetRequestResponse> {
    return this.authService.requestPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Verify a password reset code' })
  @ApiBody({ type: VerifyPasswordResetCodeDto })
  @HttpCode(200)
  @Post('password-reset/verify')
  verifyPasswordResetCode(
    @Body() dto: VerifyPasswordResetCodeDto,
  ): Promise<PasswordResetVerificationResponse> {
    return this.authService.verifyPasswordResetCode(dto);
  }

  @ApiOperation({ summary: 'Reset password using a verified reset code' })
  @ApiBody({ type: ConfirmPasswordResetDto })
  @HttpCode(200)
  @Post('password-reset/confirm')
  confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
  ): Promise<PasswordResetConfirmResponse> {
    return this.authService.confirmPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Validate whether an auth session is still active' })
  @HttpCode(200)
  @Post('sessions/validate')
  validateSession(
    @Body() dto: SessionValidationDto,
  ): Promise<SessionValidationResponse> {
    return this.authService.validateSession(dto.sessionId);
  }

  @ApiOperation({ summary: 'Get the current authenticated account profile' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getAccountProfile(
    @Request() req: JwtAuthenticatedRequest,
  ): Promise<AccountProfileResponse> {
    return this.authService.getAccountProfile(req.user.userId);
  }

  @ApiOperation({ summary: 'Update the current authenticated account profile' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: UpdateAccountDto })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateAccountProfile(
    @Request() req: JwtAuthenticatedRequest,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountProfileResponse> {
    return this.authService.updateAccountProfile(req.user.userId, dto);
  }
}
