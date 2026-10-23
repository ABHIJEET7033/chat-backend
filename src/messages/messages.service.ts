import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentData, Query, Timestamp } from 'firebase-admin/firestore';
import { ChatsService } from '../chats/chats.service';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatMessage, LastSeen, ReadReceipt } from './chat-message';

@Injectable()
export class MessagesService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly chatsService: ChatsService,
  ) {}

  async send(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
    await this.chatsService.assertMember(chatId, senderId);
    const createdAt = Timestamp.now();
    const ref = this.messages(chatId).doc();
    const payload = {
      senderId,
      text,
      createdAt,
      editedAt: null,
      deletedAt: null,
      deleted: false,
      readBy: {} as Record<string, Timestamp>,
    };
    await ref.set(payload);
    await this.chatsService.touch(chatId);
    return this.toMessage(chatId, ref.id, payload);
  }

  async list(chatId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
    this.assertLimit(limit);
    await this.chatsService.assertChatExists(chatId);

    let query: Query = this.messages(chatId).orderBy('createdAt', 'desc');
    if (before) {
      const parsed = new Date(before);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('before must be a valid ISO timestamp');
      }
      query = query.where('createdAt', '<', Timestamp.fromDate(parsed));
    }

    const snapshot = await query.limit(limit).get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (!data) {
          throw new NotFoundException('Message not found');
        }
        return this.toMessage(chatId, doc.id, data);
      })
      .reverse();
  }

  async markRead(chatId: string, messageId: string, userId: string): Promise<ReadReceipt> {
    await this.chatsService.assertMember(chatId, userId);
    await this.getMessageOrThrow(chatId, messageId);
    const readAt = Timestamp.now();
    await this.messages(chatId).doc(messageId).update({
      [`readBy.${userId}`]: readAt,
    });
    return {
      chatId,
      messageId,
      userId,
      readAt: readAt.toDate().toISOString(),
    };
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<LastSeen> {
    await this.chatsService.assertMember(chatId, userId);
    await this.getMessageOrThrow(chatId, messageId);
    const seenAt = Timestamp.now();
    await this.lastSeenCollection(chatId).doc(userId).set({
      userId,
      messageId,
      seenAt,
    });
    return {
      chatId,
      userId,
      messageId,
      seenAt: seenAt.toDate().toISOString(),
    };
  }

  async getLastSeen(chatId: string, userId: string): Promise<LastSeen> {
    await this.chatsService.assertMember(chatId, userId);
    const snapshot = await this.lastSeenCollection(chatId).doc(userId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Last seen not found');
    }
    const data = snapshot.data();
    if (!data) {
      throw new NotFoundException('Last seen not found');
    }
    return {
      chatId,
      userId,
      messageId: String(data.messageId),
      seenAt: asTimestamp(data.seenAt).toDate().toISOString(),
    };
  }

  async edit(chatId: string, messageId: string, senderId: string, text: string): Promise<ChatMessage> {
    await this.chatsService.assertMember(chatId, senderId);
    const data = await this.getMessageOrThrow(chatId, messageId);
    this.assertSender(data, senderId, 'Only the sender can edit this message');
    if (data.deleted === true) {
      throw new BadRequestException('Deleted messages cannot be edited');
    }

    const editedAt = Timestamp.now();
    await this.messages(chatId).doc(messageId).update({ text, editedAt });
    return this.toMessage(chatId, messageId, { ...data, text, editedAt });
  }

  async delete(chatId: string, messageId: string, senderId: string): Promise<ChatMessage> {
    await this.chatsService.assertMember(chatId, senderId);
    const data = await this.getMessageOrThrow(chatId, messageId);
    this.assertSender(data, senderId, 'Only the sender can delete this message');
    if (data.deleted === true) {
      return this.toMessage(chatId, messageId, data);
    }

    const deletedAt = Timestamp.now();
    const next = { ...data, deleted: true, text: '', deletedAt };
    await this.messages(chatId).doc(messageId).update({
      deleted: true,
      text: '',
      deletedAt,
    });
    return this.toMessage(chatId, messageId, next);
  }

  private messages(chatId: string) {
    return this.firebase.firestore.collection('chats').doc(chatId).collection('messages');
  }

  private lastSeenCollection(chatId: string) {
    return this.firebase.firestore.collection('chats').doc(chatId).collection('lastSeen');
  }

  private assertLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
  }

  private assertSender(data: DocumentData, senderId: string, message: string): void {
    if (data.senderId !== senderId) {
      throw new ForbiddenException(message);
    }
  }

  private async getMessageOrThrow(chatId: string, messageId: string): Promise<DocumentData> {
    const snapshot = await this.messages(chatId).doc(messageId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Message not found');
    }
    const data = snapshot.data();
    if (!data) {
      throw new NotFoundException('Message not found');
    }
    return data;
  }

  private toMessage(chatId: string, id: string, data: DocumentData): ChatMessage {
    const readByInput = (data.readBy ?? {}) as Record<string, Timestamp>;
    const readBy: Record<string, string> = {};
    for (const [userId, readAt] of Object.entries(readByInput)) {
      readBy[userId] = asTimestamp(readAt).toDate().toISOString();
    }

    return {
      id,
      chatId,
      senderId: String(data.senderId),
      text: String(data.text ?? ''),
      createdAt: asTimestamp(data.createdAt).toDate().toISOString(),
      editedAt: data.editedAt ? asTimestamp(data.editedAt).toDate().toISOString() : null,
      deletedAt: data.deletedAt ? asTimestamp(data.deletedAt).toDate().toISOString() : null,
      deleted: data.deleted === true,
      readBy,
    };
  }
}

function asTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) {
    return value;
  }
  throw new Error('Expected a Firestore timestamp');
}
