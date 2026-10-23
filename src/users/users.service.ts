import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isDuplicateKeyError } from '../common/is-duplicate-key-error';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.entity';
import { toUserView, UserView } from './user.view';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserView> {
    try {
      const user = await this.usersRepo.save(
        this.usersRepo.create({
          displayName: dto.displayName.trim(),
          email: dto.email.trim().toLowerCase(),
        }),
      );
      return toUserView(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  async getById(id: string): Promise<UserView> {
    const user = await this.findById(id);
    return toUserView(user);
  }

  async assertExists(id: string): Promise<void> {
    await this.findById(id);
  }

  async assertUsersExist(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return;
    }
    const found = await this.usersRepo.count({ where: { id: In(uniqueIds) } });
    if (found !== uniqueIds.length) {
      throw new NotFoundException('One or more users were not found');
    }
  }

  private async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
