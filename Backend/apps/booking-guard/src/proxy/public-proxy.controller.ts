import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProxyService } from './proxy.service';

type StatusResponse = {
  status: (statusCode: number) => void;
};

type LoginRequestBody = {
  email: string;
  password: string;
};

type RegisterRequestBody = LoginRequestBody;

type RefreshTokenRequestBody = {
  refresh_token: string;
};

function writeStatus(response: StatusResponse, statusCode: number): void {
  response.status(statusCode);
}

@ApiTags('guard-public-proxy')
@Controller()
export class PublicProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @ApiOperation({ summary: 'Proxy customer login to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @Post('auth/login')
  async login(
    @Body() body: LoginRequestBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/login',
      body,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy customer registration to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @Post('auth/register')
  async register(
    @Body() body: RegisterRequestBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/register',
      body,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy token refresh to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'refresh-token-value' },
      },
    },
  })
  @Post('auth/refresh')
  async refresh(
    @Body() body: RefreshTokenRequestBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/refresh',
      body,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy logout to auth-api' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'refresh-token-value' },
      },
    },
  })
  @Post('auth/logout')
  async logout(
    @Body() body: RefreshTokenRequestBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'auth',
      method: 'POST',
      path: '/auth/logout',
      body,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public services list to booking-api' })
  @Get('services')
  async findServices(
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: '/services',
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public service lookup to booking-api' })
  @Get('services/:id')
  async findService(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: `/services/${id}`,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public staff list to booking-api' })
  @Get('staff')
  async findStaff(
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: '/staff',
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }

  @ApiOperation({ summary: 'Proxy public staff lookup to booking-api' })
  @Get('staff/:id')
  async findStaffMember(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<unknown> {
    const result = await this.proxyService.forward({
      target: 'booking',
      method: 'GET',
      path: `/staff/${id}`,
    });

    writeStatus(response, result.statusCode);

    return result.body;
  }
}
