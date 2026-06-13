import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthenticatedRequest,
  AuthTokensResponse,
  LogoutResponse,
  SessionValidationResponse,
} from '@coopers/common';
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
import type {
  PasswordResetConfirmResponse,
  PasswordResetRequestResponse,
  PasswordResetVerificationResponse,
} from './auth.service';

function getRequiredUserId(userId: string | undefined): string {
  if (!userId) {
    throw new UnauthorizedException('Missing authenticated user context');
  }

  return userId;
}

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
  @Get('me')
  getAccountProfile(
    @Headers('x-user-id') userId: string | undefined,
  ): Promise<AccountProfileResponse> {
    return this.authService.getAccountProfile(getRequiredUserId(userId));
  }

  @ApiOperation({ summary: 'Update the current authenticated account profile' })
  @ApiBody({ type: UpdateAccountDto })
  @Patch('me')
  updateAccountProfile(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountProfileResponse> {
    return this.authService.updateAccountProfile(
      getRequiredUserId(userId),
      dto,
    );
  }
}
