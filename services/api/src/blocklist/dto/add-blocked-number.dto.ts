import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBlockedNumberDto {
  @ApiProperty({ example: '+44-20-XXXX-XXXX' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ required: false, example: '国際電話（不審）' })
  @IsOptional()
  @IsString()
  reason?: string;
}
