import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitSchema1762000000000 implements MigrationInterface {
  name = 'InitSchema1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'displayName', type: 'varchar', length: '120' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'chats',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'type', type: 'varchar', length: '16' },
          { name: 'name', type: 'varchar', length: '120', isNullable: true },
          { name: 'directKey', type: 'varchar', length: '80', isNullable: true, isUnique: true },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'chats',
      new TableIndex({
        name: 'IDX_chats_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'chat_members',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'chatId', type: 'varchar', length: '36' },
          { name: 'userId', type: 'varchar', length: '36' },
          { name: 'role', type: 'varchar', length: '16', default: "'member'" },
          {
            name: 'joinedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        uniques: [
          {
            name: 'UQ_chat_member',
            columnNames: ['chatId', 'userId'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'chat_members',
      new TableIndex({
        name: 'IDX_chat_members_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createForeignKey(
      'chat_members',
      new TableForeignKey({
        name: 'FK_chat_members_chat',
        columnNames: ['chatId'],
        referencedTableName: 'chats',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_members',
      new TableForeignKey({
        name: 'FK_chat_members_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chat_members');
    await queryRunner.dropIndex('chats', 'IDX_chats_updatedAt');
    await queryRunner.dropTable('chats');
    await queryRunner.dropTable('users');
  }
}
