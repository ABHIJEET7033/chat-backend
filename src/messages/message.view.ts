export interface ChatMessageView {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deleted: boolean;
  readBy: Record<string, string>;
}

export interface ReadReceiptView {
  chatId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface LastSeenView {
  chatId: string;
  userId: string;
  messageId: string;
  seenAt: string;
}
