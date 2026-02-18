import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'リフレッシュトークン' })
  @IsString()
  refreshToken: string;
}
