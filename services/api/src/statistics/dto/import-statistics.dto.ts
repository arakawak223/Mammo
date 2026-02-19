import {
  IsArray,
  IsString,
  IsInt,
  IsNumber,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

export { PREFECTURES };

export class StatisticsRecordDto {
  @ApiProperty({ description: '都道府県名', example: '東京都' })
  @IsString()
  prefecture: string;

  @ApiProperty({ description: '年月（YYYY-MM形式）', example: '2025-12' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'yearMonth は YYYY-MM 形式で入力してください' })
  yearMonth: string;

  @ApiProperty({ description: '詐欺種別', example: 'ore_ore' })
  @IsString()
  scamType: string;

  @ApiProperty({ description: '被害額（円）', example: 50000000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '件数', example: 120 })
  @IsInt()
  @Min(0)
  count: number;
}

export class ImportStatisticsDto {
  @ApiProperty({ type: [StatisticsRecordDto], description: '統計レコード配列' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatisticsRecordDto)
  records: StatisticsRecordDto[];
}
