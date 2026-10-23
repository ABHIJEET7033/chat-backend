import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatMessage, LastSeen, ReadReceipt } from './chat-message';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateLastSeenDto } from './dto/update-last-seen.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('chat')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post(':chatId/message/send')
  @ApiOperation({ summary: 'Send a message. Stored in Firestore with a server timestamp.' })
  send(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Body() body: SendMessageDto,
  ): Promise<ChatMessage> {
    return this.messagesService.send(chatId, body.senderId, body.text);
  }

  @Get(':chatId/messages')
  @ApiOperation({
    summary: 'List messages ordered by timestamp',
    description:
      'Returns the newest `limit` messages (default 50), oldest of that window first.',
  })
  list(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<ChatMessage[]> {
    return this.messagesService.list(chatId, query.limit ?? 50, query.before);
  }

  @Post(':chatId/message/:messageId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a message read for a user' })
  markRead(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: MarkReadDto,
  ): Promise<ReadReceipt> {
    return this.messagesService.markRead(chatId, messageId, body.userId);
  }

  @Patch(':chatId/message/:messageId')
  @ApiOperation({ summary: 'Edit a message. Only the sender can edit.' })
  edit(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ): Promise<ChatMessage> {
    return this.messagesService.edit(chatId, messageId, body.senderId, body.text);
  }

  @Post(':chatId/message/:messageId/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a message. Only the sender can delete.' })
  delete(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: DeleteMessageDto,
  ): Promise<ChatMessage> {
    return this.messagesService.delete(chatId, messageId, body.senderId);
  }

  @Post(':chatId/lastseen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the last message a user has seen in this chat' })
  updateLastSeen(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Body() body: UpdateLastSeenDto,
  ): Promise<LastSeen> {
    return this.messagesService.updateLastSeen(chatId, body.userId, body.messageId);
  }

  @Get(':chatId/lastseen/:userId')
  @ApiOperation({ summary: 'Read the last-seen cursor for a member' })
  getLastSeen(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<LastSeen> {
    return this.messagesService.getLastSeen(chatId, userId);
  }
}
