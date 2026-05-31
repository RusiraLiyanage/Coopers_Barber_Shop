import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthTokensResponse,
  LogoutResponse,
} from '@coopers/common';
import { AuthService } from './auth.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: AuthenticatedRequest): Promise<AuthTokensResponse> {
    return this.authService.login(req.user);
  }

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthTokensResponse> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto): Promise<LogoutResponse> {
    return this.authService.logout(dto.refresh_token);
  }
}
