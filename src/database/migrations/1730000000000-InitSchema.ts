import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1730000000000 implements MigrationInterface {
  name = 'InitSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`displayName\` varchar(120) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`chats\` (
        \`id\` varchar(36) NOT NULL,
        \`type\` enum('direct', 'group') NOT NULL,
        \`name\` varchar(120) NULL,
        \`directKey\` varchar(80) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_chats_directKey\` (\`directKey\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`chat_members\` (
        \`id\` varchar(36) NOT NULL,
        \`chatId\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`role\` enum('member', 'admin') NOT NULL DEFAULT 'member',
        \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_chat_members_userId\` (\`userId\`),
        UNIQUE INDEX \`UQ_chat_members_chat_user\` (\`chatId\`, \`userId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_chat_members_chat\` FOREIGN KEY (\`chatId\`) REFERENCES \`chats\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_chat_members_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `chat_members`');
    await queryRunner.query('DROP TABLE `chats`');
    await queryRunner.query('DROP TABLE `users`');
  }
}
