import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatSummary } from './chat-summary';
import { ChatsService } from './chats.service';

@ApiTags('chats')
@Controller('user')
export class UserChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get(':userId/chats')
  @ApiOperation({ summary: 'List chats for a user, with member ids from MySQL' })
  list(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<ChatSummary[]> {
    return this.chatsService.listForUser(userId);
  }
}
