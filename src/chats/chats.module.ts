import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ChatMember } from './chat-member.entity';
import { Chat } from './chat.entity';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { UserChatsController } from './user-chats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMember]), UsersModule],
  controllers: [ChatsController, UserChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
