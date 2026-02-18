import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinPairingDto {
  @ApiProperty({ example: 'ABC123', description: '6桁の招待コード' })
  @IsString()
  @Length(6, 6)
  code: string;
}
