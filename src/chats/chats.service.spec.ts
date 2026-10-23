import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ChatMember } from './chat-member.entity';
import { ChatType } from './chat-type.enum';
import { Chat } from './chat.entity';
import { ChatsService } from './chats.service';
import { MemberRole } from './member-role.enum';

const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('ChatsService', () => {
  const usersService = {
    assertExists: jest.fn(),
    assertUsersExist: jest.fn(),
  };
  const chatsRepo = {
    create: jest.fn((value: Partial<Chat>) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const membersRepo = {
    create: jest.fn((value: Partial<ChatMember>) => value),
  };

  const service = new ChatsService(
    chatsRepo as unknown as Repository<Chat>,
    membersRepo as unknown as Repository<ChatMember>,
    usersService as unknown as UsersService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    usersService.assertUsersExist.mockResolvedValue(undefined);
  });

  it('rejects a direct chat with one user', async () => {
    await expect(service.createOrGetDirect(userA, userA)).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.assertUsersExist).not.toHaveBeenCalled();
  });

  it('returns an existing direct chat in either argument order', async () => {
    chatsRepo.findOne.mockResolvedValue({ id: 'chat-1' });

    await expect(service.createOrGetDirect(userB, userA)).resolves.toEqual({ chatId: 'chat-1' });
    expect(chatsRepo.findOne).toHaveBeenCalledWith({ where: { directKey: `${userA}:${userB}` } });
    expect(chatsRepo.save).not.toHaveBeenCalled();
  });

  it('creates a direct chat for two members', async () => {
    chatsRepo.findOne.mockResolvedValue(null);
    chatsRepo.save.mockImplementation(async (chat: Chat) => ({ ...chat, id: 'chat-2' }));

    await expect(service.createOrGetDirect(userA, userB)).resolves.toEqual({ chatId: 'chat-2' });

    const saved = chatsRepo.save.mock.calls[0][0] as Chat;
    expect(saved.type).toBe(ChatType.DIRECT);
    expect(saved.directKey).toBe(`${userA}:${userB}`);
    expect(saved.members.map((member) => member.userId).sort()).toEqual([userA, userB]);
  });

  it('returns the chat created by a concurrent insert', async () => {
    chatsRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'raced-chat' });
    chatsRepo.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });

    await expect(service.createOrGetDirect(userA, userB)).resolves.toEqual({ chatId: 'raced-chat' });
  });

  it('requires two people to create a group and makes the creator an admin', async () => {
    await expect(service.createGroup({ creatorId: userA, name: 'Solo', memberIds: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    chatsRepo.save.mockImplementation(async (chat: Chat) => ({ ...chat, id: 'group-1' }));
    await expect(
      service.createGroup({ creatorId: userA, name: 'Crew', memberIds: [userB] }),
    ).resolves.toEqual({ chatId: 'group-1' });

    const saved = chatsRepo.save.mock.calls[0][0] as Chat;
    expect(saved.type).toBe(ChatType.GROUP);
    expect(saved.directKey).toBeNull();
    expect(saved.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: userA, role: MemberRole.ADMIN }),
        expect.objectContaining({ userId: userB, role: MemberRole.MEMBER }),
      ]),
    );
  });
});
