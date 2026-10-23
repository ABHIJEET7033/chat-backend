import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  actorId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;
}
