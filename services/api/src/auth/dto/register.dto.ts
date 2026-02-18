import { IsString, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '09012345678', description: '電話番号（ハイフンなし）' })
  @IsString()
  @Matches(/^0[0-9]{9,10}$/, { message: '有効な電話番号を入力してください' })
  phone: string;

  @ApiProperty({ example: '田中太郎', description: '氏名' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'password123', description: 'パスワード（8文字以上）' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: ['elderly', 'family_owner', 'family_member'],
    description: 'ユーザー種別（elderly: 高齢者 / family_owner: 家族オーナー / family_member: 家族メンバー）',
  })
  @IsEnum(['elderly', 'family_owner', 'family_member'] as const)
  role: 'elderly' | 'family_owner' | 'family_member';

  @ApiProperty({ example: '東京都', required: false, description: '都道府県（任意）' })
  @IsOptional()
  @IsString()
  prefecture?: string;
}
