import { ChatType } from './chat-type.enum';

export interface ChatSummary {
  chatId: string;
  type: ChatType;
  name: string | null;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}
