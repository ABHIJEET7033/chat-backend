import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { UuidField } from '../../common/uuid-field';

export class SendMessageDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  senderId!: string;

  @ApiProperty({ maxLength: 4000 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

export class EditMessageDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  senderId!: string;

  @ApiProperty({ maxLength: 4000 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

export class DeleteMessageDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  senderId!: string;
}

export class MarkReadDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  userId!: string;
}

export class UpdateLastSeenDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  userId!: string;

  @ApiProperty({ description: 'Firestore message id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  messageId!: string;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional({
    description: 'Return the page of messages created before this ISO-8601 timestamp',
  })
  @IsOptional()
  @IsISO8601()
  before?: string;
}
