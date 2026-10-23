import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ChatsController } from './chats/chats.controller';
import { UserChatsController } from './chats/user-chats.controller';
import { ChatsService } from './chats/chats.service';
import { HealthController } from './health/health.controller';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

const userA = '3f1c2c2a-6a1e-4b1a-9d2e-1b1c1d1e1f11';
const userB = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const chatId = '11111111-1111-4111-8111-111111111111';

describe('HTTP API', () => {
  let app: INestApplication;
  const chatsService = {
    createOrGetDirect: jest.fn(),
    createGroup: jest.fn(),
    listForUser: jest.fn(),
    getById: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    rename: jest.fn(),
  };
  const messagesService = {
    send: jest.fn(),
    list: jest.fn(),
    markRead: jest.fn(),
    updateLastSeen: jest.fn(),
    getLastSeen: jest.fn(),
    edit: jest.fn(),
    delete: jest.fn(),
  };
  const usersService = {
    create: jest.fn(),
    getById: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        HealthController,
        UsersController,
        ChatsController,
        UserChatsController,
        MessagesController,
      ],
      providers: [
        { provide: ChatsService, useValue: chatsService },
        { provide: MessagesService, useValue: messagesService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('POST /chat/create normalizes user ids and returns a chat id', async () => {
    chatsService.createOrGetDirect.mockResolvedValue({ chatId });

    await request(app.getHttpServer())
      .post('/chat/create')
      .send({ userAId: userA.toUpperCase(), userBId: userB.toUpperCase() })
      .expect(200)
      .expect({ chatId });

    expect(chatsService.createOrGetDirect).toHaveBeenCalledWith(userA, userB);
  });

  it('POST /chat/create rejects a malformed body', async () => {
    await request(app.getHttpServer()).post('/chat/create').send({ userAId: userA }).expect(400);
  });

  it('POST /chat/:chatId/message/send', async () => {
    messagesService.send.mockResolvedValue({ id: 'm1', text: 'hello' });

    await request(app.getHttpServer())
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: userA, text: 'hello' })
      .expect(201)
      .expect({ id: 'm1', text: 'hello' });

    expect(messagesService.send).toHaveBeenCalledWith(chatId, userA, 'hello');
  });

  it('GET /chat/:chatId/messages passes limit and cursor', async () => {
    messagesService.list.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get(`/chat/${chatId}/messages`)
      .query({ limit: 50, before: '2026-01-01T00:00:00.000Z' })
      .expect(200)
      .expect([]);

    expect(messagesService.list).toHaveBeenCalledWith(chatId, 50, '2026-01-01T00:00:00.000Z');
  });

  it('GET /chat/:chatId/messages rejects a limit outside 1..100', async () => {
    await request(app.getHttpServer()).get(`/chat/${chatId}/messages`).query({ limit: 0 }).expect(400);
  });

  it('POST /chat/:chatId/message/:messageId/read', async () => {
    messagesService.markRead.mockResolvedValue({ messageId: 'm1', userId: userB });

    await request(app.getHttpServer())
      .post(`/chat/${chatId}/message/m1/read`)
      .send({ userId: userB })
      .expect(200);

    expect(messagesService.markRead).toHaveBeenCalledWith(chatId, 'm1', userB);
  });

  it('POST /chat/:chatId/lastseen', async () => {
    messagesService.updateLastSeen.mockResolvedValue({ messageId: 'm1', userId: userB });

    await request(app.getHttpServer())
      .post(`/chat/${chatId}/lastseen`)
      .send({ userId: userB, messageId: 'm1' })
      .expect(200);

    expect(messagesService.updateLastSeen).toHaveBeenCalledWith(chatId, userB, 'm1');
  });

  it('GET /user/:userId/chats', async () => {
    chatsService.listForUser.mockResolvedValue([{ chatId, memberIds: [userA, userB] }]);

    await request(app.getHttpServer())
      .get(`/user/${userA}/chats`)
      .expect(200)
      .expect([{ chatId, memberIds: [userA, userB] }]);
  });

  it('POST /chat/group, PATCH edit, and POST delete', async () => {
    chatsService.createGroup.mockResolvedValue({ chatId });
    messagesService.edit.mockResolvedValue({ id: 'm1', text: 'edited' });
    messagesService.delete.mockResolvedValue({ id: 'm1', deleted: true });

    await request(app.getHttpServer())
      .post('/chat/group')
      .send({ creatorId: userA, name: 'Crew', memberIds: [userB] })
      .expect(201)
      .expect({ chatId });

    await request(app.getHttpServer())
      .patch(`/chat/${chatId}/message/m1`)
      .send({ senderId: userA, text: 'edited' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/chat/${chatId}/message/m1/delete`)
      .send({ senderId: userA })
      .expect(200)
      .expect({ id: 'm1', deleted: true });
  });
});
