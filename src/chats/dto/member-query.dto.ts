import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MemberQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
