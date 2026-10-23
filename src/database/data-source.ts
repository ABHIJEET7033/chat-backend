import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ChatMember } from '../chats/chat-member.entity';
import { Chat } from '../chats/chat.entity';
import { User } from '../users/user.entity';
import { InitSchema1730000000000 } from './migrations/1730000000000-InitSchema';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE,
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [User, Chat, ChatMember],
  migrations: [InitSchema1730000000000],
});
