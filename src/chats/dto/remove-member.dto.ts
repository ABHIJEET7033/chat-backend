import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RemoveMemberDto {
  @ApiProperty({ format: 'uuid', description: 'Admin removing someone else, or the member leaving' })
  @IsUUID()
  actorId!: string;
}
