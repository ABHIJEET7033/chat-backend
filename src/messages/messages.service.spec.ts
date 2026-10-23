import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { ChatsService } from '../chats/chats.service';
import { FirebaseService } from '../firebase/firebase.service';
import { createFakeFirestore } from '../../test/fake-firestore';
import { MessagesService } from './messages.service';

const chatId = '11111111-1111-4111-8111-111111111111';
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('MessagesService', () => {
  let service: MessagesService;
  let store: Map<string, Record<string, unknown>>;
  const chats = {
    assertMember: jest.fn(),
    assertChatExists: jest.fn(),
    touch: jest.fn(),
  };
  let millis = 1_700_000_000_000;

  beforeEach(() => {
    millis += 10_000;
    jest.spyOn(Timestamp, 'now').mockImplementation(() => {
      millis += 1000;
      return Timestamp.fromMillis(millis);
    });

    store = new Map();
    chats.assertMember.mockResolvedValue({ id: chatId });
    chats.assertChatExists.mockResolvedValue({ id: chatId });
    chats.touch.mockResolvedValue(undefined);

    const firebase = {
      firestore: createFakeFirestore(store),
    } as unknown as FirebaseService;
    service = new MessagesService(firebase, chats as unknown as ChatsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a message and bumps the chat', async () => {
    const message = await service.send(chatId, userA, 'hello');

    expect(message).toMatchObject({
      chatId,
      senderId: userA,
      text: 'hello',
      deleted: false,
      readBy: {},
    });
    expect(message.createdAt).toEqual(expect.any(String));
    expect(chats.touch).toHaveBeenCalledWith(chatId);
    expect(store.size).toBe(1);
  });

  it('does not write when the sender is not a member', async () => {
    chats.assertMember.mockRejectedValue(new ForbiddenException('User is not a member of this chat'));

    await expect(service.send(chatId, userA, 'hello')).rejects.toBeInstanceOf(ForbiddenException);
    expect(store.size).toBe(0);
    expect(chats.touch).not.toHaveBeenCalled();
  });

  it('returns the newest page in chronological order', async () => {
    await service.send(chatId, userA, 'one');
    await service.send(chatId, userA, 'two');
    await service.send(chatId, userB, 'three');

    const page = await service.list(chatId, 2);

    expect(page.map((message) => message.text)).toEqual(['two', 'three']);
  });

  it('pages older messages with before', async () => {
    await service.send(chatId, userA, 'one');
    await service.send(chatId, userA, 'two');
    const latest = await service.send(chatId, userA, 'three');

    const older = await service.list(chatId, 10, latest.createdAt);

    expect(older.map((message) => message.text)).toEqual(['one', 'two']);
  });

  it('records a read receipt on the message', async () => {
    const message = await service.send(chatId, userA, 'hello');
    const receipt = await service.markRead(chatId, message.id, userB);
    const [stored] = await service.list(chatId, 10);

    expect(receipt.userId).toBe(userB);
    expect(stored.readBy[userB]).toBe(receipt.readAt);
  });

  it('rejects last seen for a missing message', async () => {
    await expect(service.updateLastSeen(chatId, userA, 'missing-message')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('stores and returns a last-seen cursor', async () => {
    const message = await service.send(chatId, userA, 'hello');
    const saved = await service.updateLastSeen(chatId, userB, message.id);
    const loaded = await service.getLastSeen(chatId, userB);

    expect(loaded).toEqual(saved);
  });

  it('lets only the sender edit', async () => {
    const message = await service.send(chatId, userA, 'hello');

    await expect(service.edit(chatId, message.id, userB, 'nope')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const edited = await service.edit(chatId, message.id, userA, 'hello!');
    expect(edited.text).toBe('hello!');
    expect(edited.editedAt).toEqual(expect.any(String));
  });

  it('soft-deletes a message and blocks a later edit', async () => {
    const message = await service.send(chatId, userA, 'hello');
    const deleted = await service.delete(chatId, message.id, userA);

    expect(deleted.deleted).toBe(true);
    expect(deleted.text).toBe('');
    await expect(service.edit(chatId, message.id, userA, 'again')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns not found when the chat does not exist', async () => {
    chats.assertChatExists.mockRejectedValue(new NotFoundException('Chat not found'));

    await expect(service.list(chatId, 50)).rejects.toBeInstanceOf(NotFoundException);
  });
});
