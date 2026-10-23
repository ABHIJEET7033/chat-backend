import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const usersRepo = {
    create: jest.fn((value: Partial<User>) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: usersRepo }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates a user profile', async () => {
    usersRepo.save.mockImplementation(async (user: User) => ({
      ...user,
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const profile = await service.create({
      displayName: ' Ada ',
      email: 'Ada@Example.com',
    });

    expect(profile.displayName).toBe('Ada');
    expect(profile.email).toBe('ada@example.com');
    expect(profile.id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('rejects a duplicate email', async () => {
    usersRepo.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

    await expect(service.create({ displayName: 'Ada', email: 'ada@example.com' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns not found for a missing user', async () => {
    usersRepo.findOne.mockResolvedValue(null);

    await expect(service.getById('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects when any requested user is missing', async () => {
    usersRepo.count.mockResolvedValue(1);

    await expect(service.assertUsersExist(['a', 'b'])).rejects.toBeInstanceOf(NotFoundException);
  });
});
