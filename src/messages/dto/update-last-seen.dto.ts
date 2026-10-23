import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateLastSeenDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Firestore message id the user has seen' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  messageId!: string;
}
