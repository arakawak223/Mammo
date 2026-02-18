import { Exclude } from 'class-transformer';

export class UserResponseDto {
  id: string;
  phone: string;
  name: string;
  role: string;
  prefecture?: string;
  deviceToken?: string;
  createdAt: Date;
  updatedAt: Date;

  @Exclude()
  passwordHash: string;
}
