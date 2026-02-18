import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class DarkJobCheckDto {
  @ApiProperty({ description: 'チェック対象のメッセージまたは求人テキスト' })
  @IsString()
  text: string;

  @ApiProperty({ required: false, description: 'テキストの出典（sms, sns など）' })
  @IsOptional()
  @IsString()
  source?: string;
}

class VoiceAnalyzeDto {
  @ApiProperty({ description: '音声認識で得られたテキスト（transcript）' })
  @IsString()
  transcript: string;
}

const CONSULTATION_CONTACTS = [
  { name: '警察相談ダイヤル', phone: '#9110', description: '警察に犯罪関連の相談ができます' },
  { name: '消費者ホットライン', phone: '188', description: '消費者トラブルの相談窓口' },
  { name: '法テラス', phone: '0570-078374', description: '無料法律相談' },
  { name: '若者の悩み相談', phone: '0120-86-7867', description: '24時間対応の相談窓口' },
];

@ApiTags('AI解析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('dark-job-check')
  @ApiOperation({
    summary: '闇バイトチェッカー',
    description: 'メッセージや求人投稿が闇バイト（犯罪的アルバイト）の勧誘かどうかを判定します。相談先情報も併せて返却します。',
  })
  async checkDarkJob(@Body() dto: DarkJobCheckDto) {
    const result = await this.aiService.checkDarkJob(dto.text, dto.source);
    return {
      ...result,
      consultationContacts: CONSULTATION_CONTACTS,
    };
  }

  @Post('voice-analyze')
  @ApiOperation({
    summary: 'AI音声解析（transcript受信）',
    description: '音声認識テキストを受信し、AI詐欺解析を実行。結果をイベントとして保存し、家族に通知します。',
  })
  async voiceAnalyze(@Req() req: any, @Body() dto: VoiceAnalyzeDto) {
    const userId = req.user.id;
    return this.aiService.voiceAnalyze(userId, dto.transcript);
  }
}
