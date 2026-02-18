import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBlockedNumberDto {
  @ApiProperty({ example: '+44-20-XXXX-XXXX', description: 'ブロックする電話番号' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ required: false, example: '国際電話（不審）', description: 'ブロック理由（任意）' })
  @IsOptional()
  @IsString()
  reason?: string;
}
