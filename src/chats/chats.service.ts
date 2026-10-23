import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateKeyError } from '../common/is-duplicate-key-error';
import { UsersService } from '../users/users.service';
import { ChatMember } from './chat-member.entity';
import { ChatType } from './chat-type.enum';
import { Chat } from './chat.entity';
import { ChatCreatedView, ChatView } from './chat.view';
import { CreateGroupChatDto } from './dto/chat.dto';
import { MemberRole } from './member-role.enum';

const MAX_GROUP_MEMBERS = 100;

export function buildDirectKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(':');
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatsRepo: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly membersRepo: Repository<ChatMember>,
    private readonly usersService: UsersService,
  ) {}

  async createOrGetDirect(userAId: string, userBId: string): Promise<ChatCreatedView> {
    if (userAId === userBId) {
      throw new BadRequestException('A direct chat requires two different users');
    }
    await this.usersService.assertUsersExist([userAId, userBId]);
    const directKey = buildDirectKey(userAId, userBId);

    const existing = await this.chatsRepo.findOne({ where: { directKey } });
    if (existing) {
      return { chatId: existing.id };
    }

    try {
      const chat = await this.chatsRepo.save(
        this.chatsRepo.create({
          type: ChatType.DIRECT,
          name: null,
          directKey,
          members: [userAId, userBId].map((userId) =>
            this.membersRepo.create({
              userId,
              role: MemberRole.MEMBER,
            }),
          ),
        }),
      );
      return { chatId: chat.id };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      const raced = await this.chatsRepo.findOne({ where: { directKey } });
      if (!raced) {
        throw error;
      }
      return { chatId: raced.id };
    }
  }

  async createGroup(dto: CreateGroupChatDto): Promise<ChatCreatedView> {
    const memberIds = [...new Set([dto.creatorId, ...dto.memberIds])];
    if (memberIds.length < 2) {
      throw new BadRequestException('A group chat requires at least two members');
    }
    if (memberIds.length > MAX_GROUP_MEMBERS) {
      throw new BadRequestException(`A group chat cannot exceed ${MAX_GROUP_MEMBERS} members`);
    }
    await this.usersService.assertUsersExist(memberIds);

    const chat = await this.chatsRepo.save(
      this.chatsRepo.create({
        type: ChatType.GROUP,
        name: dto.name,
        directKey: null,
        members: memberIds.map((userId) =>
          this.membersRepo.create({
            userId,
            role: userId === dto.creatorId ? MemberRole.ADMIN : MemberRole.MEMBER,
          }),
        ),
      }),
    );
    return { chatId: chat.id };
  }

  async listForUser(userId: string): Promise<ChatView[]> {
    await this.usersService.assertExists(userId);
    const memberships = await this.membersRepo
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'member')
      .where('membership.userId = :userId', { userId })
      .orderBy('chat.updatedAt', 'DESC')
      .addOrderBy('chat.createdAt', 'DESC')
      .getMany();

    return memberships.map((membership) => this.toView(membership.chat));
  }

  async getById(chatId: string): Promise<ChatView> {
    const chat = await this.chatsRepo.findOne({
      where: { id: chatId },
      relations: { members: true },
    });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return this.toView(chat);
  }

  async addMember(chatId: string, actorId: string, memberId: string): Promise<ChatView> {
    const actor = await this.assertMember(chatId, actorId);
    this.assertGroupAdmin(actor, 'Members can only be added to group chats');
    await this.usersService.assertExists(memberId);

    const existing = await this.membersRepo.findOne({ where: { chatId, userId: memberId } });
    if (existing) {
      throw new ConflictException('User is already a member of this chat');
    }

    const memberCount = await this.membersRepo.count({ where: { chatId } });
    if (memberCount >= MAX_GROUP_MEMBERS) {
      throw new BadRequestException(`A group chat cannot exceed ${MAX_GROUP_MEMBERS} members`);
    }

    try {
      await this.membersRepo.save(
        this.membersRepo.create({
          chatId,
          userId: memberId,
          role: MemberRole.MEMBER,
        }),
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('User is already a member of this chat');
      }
      throw error;
    }
    await this.touch(chatId);
    return this.getById(chatId);
  }

  async removeMember(chatId: string, actorId: string, memberId: string): Promise<void> {
    const actor = await this.assertMember(chatId, actorId);
    if (actor.chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Members can only be removed from group chats');
    }
    const isSelf = actorId === memberId;
    if (!isSelf && actor.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only an admin can remove other members');
    }

    const target = await this.membersRepo.findOne({ where: { chatId, userId: memberId } });
    if (!target) {
      throw new NotFoundException('Member not found');
    }

    if (target.role === MemberRole.ADMIN) {
      const [adminCount, memberCount] = await Promise.all([
        this.membersRepo.count({ where: { chatId, role: MemberRole.ADMIN } }),
        this.membersRepo.count({ where: { chatId } }),
      ]);
      if (adminCount === 1 && memberCount > 1) {
        throw new BadRequestException('Promote another admin before removing the last admin');
      }
    }

    await this.membersRepo.delete({ id: target.id });
    await this.touch(chatId);
  }

  async rename(chatId: string, actorId: string, name: string): Promise<ChatView> {
    const actor = await this.assertMember(chatId, actorId);
    this.assertGroupAdmin(actor, 'Only group chats can be renamed');
    actor.chat.name = name;
    await this.chatsRepo.save(actor.chat);
    return this.getById(chatId);
  }

  async getChatOrThrow(chatId: string): Promise<Chat> {
    return this.assertChatExists(chatId);
  }

  async assertChatExists(chatId: string): Promise<Chat> {
    const chat = await this.chatsRepo.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  async assertMember(chatId: string, userId: string): Promise<ChatMember> {
    const member = await this.membersRepo.findOne({
      where: { chatId, userId },
      relations: { chat: true },
    });
    if (member) {
      return member;
    }
    await this.assertChatExists(chatId);
    throw new ForbiddenException('User is not a member of this chat');
  }

  async touch(chatId: string): Promise<void> {
    await this.chatsRepo.update({ id: chatId }, { updatedAt: new Date() });
  }

  private assertGroupAdmin(actor: ChatMember, typeError: string): void {
    if (actor.chat.type !== ChatType.GROUP) {
      throw new BadRequestException(typeError);
    }
    if (actor.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only an admin can manage this group');
    }
  }

  private toView(chat: Chat): ChatView {
    const members = chat.members ?? [];
    return {
      chatId: chat.id,
      type: chat.type,
      name: chat.name,
      memberIds: members.map((member) => member.userId).sort(),
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  }
}
