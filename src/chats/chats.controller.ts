import {
  Body,
  Controller,
  Delete,
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
import { ChatsService } from './chats.service';
import { ChatCreatedView, ChatView } from './chat.view';
import {
  AddMemberDto,
  CreateDirectChatDto,
  CreateGroupChatDto,
  RenameChatDto,
} from './dto/chat.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';

@ApiTags('chats')
@Controller('chat')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a 1:1 chat or return the existing one' })
  create(@Body() body: CreateDirectChatDto): Promise<ChatCreatedView> {
    return this.chatsService.createOrGetDirect(body.userAId, body.userBId);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group chat' })
  createGroup(@Body() body: CreateGroupChatDto): Promise<ChatCreatedView> {
    return this.chatsService.createGroup(body);
  }

  @Get(':chatId')
  @ApiOperation({ summary: 'Get a chat the user belongs to' })
  async get(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Query() query: MemberQueryDto,
  ): Promise<ChatView> {
    await this.chatsService.assertMember(chatId, query.userId);
    return this.chatsService.getById(chatId);
  }

  @Patch(':chatId')
  @ApiOperation({ summary: 'Rename a group chat' })
  rename(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Body() body: RenameChatDto,
  ): Promise<ChatView> {
    return this.chatsService.rename(chatId, body.actorId, body.name);
  }

  @Post(':chatId/members')
  @ApiOperation({ summary: 'Add a member to a group chat' })
  addMember(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Body() body: AddMemberDto,
  ): Promise<ChatView> {
    return this.chatsService.addMember(chatId, body.actorId, body.memberId);
  }

  @Delete(':chatId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member or leave a group chat' })
  async removeMember(
    @Param('chatId', new ParseUUIDPipe()) chatId: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body() body: RemoveMemberDto,
  ): Promise<ChatView> {
    await this.chatsService.removeMember(chatId, body.actorId, memberId);
    return this.chatsService.getById(chatId);
  }
}
