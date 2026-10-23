import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
