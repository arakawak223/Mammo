import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePairingDto {
  @ApiProperty({ description: '高齢者のユーザーID' })
  @IsString()
  elderlyId: string;
}
