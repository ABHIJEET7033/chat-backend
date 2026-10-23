import { User } from './user.entity';

export interface UserView {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
