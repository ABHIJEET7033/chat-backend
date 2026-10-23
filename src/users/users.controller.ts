import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { uuidPipe } from '../common/uuid.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { UserView } from './user.view';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'User created' })
  create(@Body() dto: CreateUserDto): Promise<UserView> {
    return this.usersService.create(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiOkResponse({ description: 'User' })
  getById(@Param('userId', uuidPipe) userId: string): Promise<UserView> {
    return this.usersService.getById(userId);
  }
}
