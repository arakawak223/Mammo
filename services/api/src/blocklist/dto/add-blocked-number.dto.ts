import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBlockedNumberDto {
  @ApiProperty({ example: '09000000000', description: 'ブロックする電話番号' })
  @IsString()
  @Matches(/^[0-9+\-() ]{3,20}$/, { message: '有効な電話番号を入力してください' })
  phoneNumber: string;

  @ApiProperty({ required: false, example: '国際電話（不審）', description: 'ブロック理由（任意）' })
  @IsOptional()
  @IsString()
  reason?: string;
}
