import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@coopers/entities';
import { AdminRealtimeAuthService } from './admin-realtime-auth.service';

describe('AdminRealtimeAuthService', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates an admin token from the admin access-token cookie', async () => {
    const service = new AdminRealtimeAuthService(
      jwtService as unknown as JwtService,
    );

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      sid: 'session-1',
    });

    const user = await service.authenticateHandshake({
      headers: {
        cookie: 'other=value; admin_tsa=admin-token',
      },
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('admin-token', {
      issuer: 'coopers-auth',
      audience: 'coopers-api',
    });
    expect(user).toEqual({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      sessionId: 'session-1',
    });
  });

  it('authenticates an admin token from the authorization header', async () => {
    const service = new AdminRealtimeAuthService(
      jwtService as unknown as JwtService,
    );

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });

    await service.authenticateHandshake({
      headers: {
        authorization: 'Bearer header-token',
      },
    });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token', {
      issuer: 'coopers-auth',
      audience: 'coopers-api',
    });
  });

  it('rejects non-admin tokens', async () => {
    const service = new AdminRealtimeAuthService(
      jwtService as unknown as JwtService,
    );

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'customer-1',
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
    });

    await expect(
      service.authenticateHandshake({
        headers: {
          cookie: 'admin_tsa=customer-token',
        },
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects missing tokens', async () => {
    const service = new AdminRealtimeAuthService(
      jwtService as unknown as JwtService,
    );

    await expect(
      service.authenticateHandshake({
        headers: {},
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });
});
