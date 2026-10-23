import { ChatType } from './chat-type.enum';

export interface ChatView {
  chatId: string;
  type: ChatType;
  name: string | null;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatCreatedView {
  chatId: string;
}
