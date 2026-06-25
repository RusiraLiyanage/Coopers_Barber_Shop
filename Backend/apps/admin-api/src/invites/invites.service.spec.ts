/// <reference types="jest" />

import { PasswordService } from '@coopers/common';
import { InviteToken, User, UserRole } from '@coopers/entities';
import { InvitesService } from './invites.service';

describe('InvitesService transactions', () => {
  const inviteTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const transactionalInviteTokenRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const transactionalUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const passwordService = {
    hash: jest.fn(),
  };
  const transactionManager = {
    getRepository: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.getRepository.mockImplementation((entity) => {
      if (entity === User) {
        return transactionalUserRepository;
      }

      if (entity === InviteToken) {
        return transactionalInviteTokenRepository;
      }

      throw new Error(`Unexpected repository requested: ${String(entity)}`);
    });
    dataSource.transaction.mockImplementation(
      (callback: (manager: typeof transactionManager) => unknown) =>
        Promise.resolve(callback(transactionManager)),
    );
  });

  it('creates the admin user and marks the invite used in one transaction', async () => {
    const service = new InvitesService(
      inviteTokenRepository as never,
      userRepository as never,
      passwordService as unknown as PasswordService,
      dataSource as never,
    );
    const inviteToken = {
      token: 'invite-token',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      used: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedUser: null,
    };
    const savedUser = {
      id: 'user-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    };

    inviteTokenRepository.findOne.mockResolvedValue(inviteToken);
    userRepository.findOne.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('hashed-password');
    transactionalInviteTokenRepository.findOne.mockResolvedValue({
      ...inviteToken,
    });
    transactionalUserRepository.findOne.mockResolvedValue(null);
    transactionalUserRepository.create.mockReturnValue(savedUser);
    transactionalUserRepository.save.mockResolvedValue(savedUser);
    transactionalInviteTokenRepository.save.mockResolvedValue({
      ...inviteToken,
      used: true,
      acceptedUser: savedUser,
    });

    const result = await service.acceptAdminInvite({
      token: 'invite-token',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    });

    expect(result).toEqual({
      success: true,
      email: 'admin@example.com',
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionalInviteTokenRepository.findOne).toHaveBeenCalledWith({
      where: { token: 'invite-token' },
      relations: { acceptedUser: true },
      lock: { mode: 'pessimistic_write' },
    });
    expect(transactionalUserRepository.create).toHaveBeenCalledWith({
      email: 'admin@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Admin',
      lastName: 'User',
      mobile: null,
      suburb: null,
      role: UserRole.ADMIN,
    });
    expect(transactionalUserRepository.save).toHaveBeenCalledWith(savedUser);
    expect(transactionalInviteTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        used: true,
        acceptedUser: savedUser,
      }),
    );
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(inviteTokenRepository.save).not.toHaveBeenCalled();
  });
});
