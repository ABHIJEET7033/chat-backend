import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from './chats/chats.module';
import { envValidationSchema, readBoolean } from './config/env.validation';
import { InitSchema1730000000000 } from './database/migrations/1730000000000-InitSchema';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthController } from './health.controller';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string | number>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD') ?? '',
        database: config.getOrThrow<string>('DB_DATABASE'),
        charset: 'utf8mb4',
        timezone: 'Z',
        autoLoadEntities: true,
        synchronize: readBoolean(config.get('DB_SYNCHRONIZE'), false),
        migrations: [InitSchema1730000000000],
        migrationsRun: readBoolean(config.get('DB_MIGRATIONS_RUN'), true),
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    FirebaseModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
