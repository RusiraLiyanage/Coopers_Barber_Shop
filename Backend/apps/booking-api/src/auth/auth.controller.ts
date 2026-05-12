import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedRequest } from './auth.types';

// This is where the API endpoints are outsourced.

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Login endpoint using local strategy.
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  // Registration endpoint.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
