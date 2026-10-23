import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateDirectChatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userAId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userBId!: string;
}
