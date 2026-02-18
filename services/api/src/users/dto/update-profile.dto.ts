import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, description: '表示名' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ required: false, description: '都道府県' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  prefecture?: string;
}
