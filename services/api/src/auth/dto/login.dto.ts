import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '09012345678', description: '登録済み電話番号' })
  @IsString()
  @Matches(/^0[0-9]{9,10}$/)
  phone: string;

  @ApiProperty({ example: 'password123', description: 'パスワード' })
  @IsString()
  @MinLength(8)
  password: string;
}
