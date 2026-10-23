import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Chat } from './chat.entity';
import { MemberRole } from './member-role.enum';

@Entity('chat_members')
@Unique('UQ_chat_member', ['chatId', 'userId'])
@Index(['userId'])
export class ChatMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  chatId!: string;

  @Column({ type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 16, default: MemberRole.MEMBER })
  role!: MemberRole;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  joinedAt!: Date;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat!: Chat;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
