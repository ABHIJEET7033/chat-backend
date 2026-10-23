import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  senderId!: string;
}
