import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UuidField } from '../../common/uuid-field';

export class CreateDirectChatDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  userAId!: string;

  @ApiProperty({ format: 'uuid' })
  @UuidField()
  userBId!: string;
}

export class CreateGroupChatDto {
  @ApiProperty({ format: 'uuid' })
  @UuidField()
  creatorId!: string;

  @ApiProperty({ example: 'Launch crew', maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @UuidField({ each: true })
  memberIds!: string[];
}

export class AddMemberDto {
  @ApiProperty({ format: 'uuid', description: 'Admin performing the action' })
  @UuidField()
  actorId!: string;

  @ApiProperty({ format: 'uuid' })
  @UuidField()
  memberId!: string;
}

export class RenameChatDto {
  @ApiProperty({ format: 'uuid', description: 'Admin performing the action' })
  @UuidField()
  actorId!: string;

  @ApiProperty({ example: 'Launch crew', maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
