import { IsString, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '09012345678' })
  @IsString()
  @Matches(/^0[0-9]{9,10}$/, { message: '有効な電話番号を入力してください' })
  phone: string;

  @ApiProperty({ example: '田中太郎' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: ['elderly', 'family_owner', 'family_member'] })
  @IsEnum(['elderly', 'family_owner', 'family_member'] as const)
  role: 'elderly' | 'family_owner' | 'family_member';

  @ApiProperty({ example: '東京都', required: false })
  @IsOptional()
  @IsString()
  prefecture?: string;
}
