import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatType } from './chat-type.enum';
import { ChatMember } from './chat-member.entity';

@Entity('chats')
@Index(['updatedAt'])
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: ChatType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name!: string | null;

  /**
   * Stable identity for a 1:1 chat: the two user ids sorted and joined.
   * Null for group chats. The unique index makes create-or-get safe under races.
   */
  @Column({ type: 'varchar', length: 80, unique: true, nullable: true })
  directKey!: string | null;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @OneToMany(() => ChatMember, (membership) => membership.chat, { cascade: true })
  members!: ChatMember[];
}
