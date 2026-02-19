import { Controller, Post, Get, Body, UseGuards, Req, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class DarkJobCheckDto {
  @ApiProperty({ description: 'チェック対象のメッセージまたは求人テキスト' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'テキストの出典（sms, sns など）' })
  @IsOptional()
  @IsString()
  source?: string;
}

class DarkJobImageCheckDto {
  @ApiProperty({ description: 'Base64エンコードされた画像データ' })
  @IsString()
  imageBase64: string;

  @ApiPropertyOptional({ description: '画像の出典（screenshot, photo など）' })
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

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('dark-job-check')
  @ApiOperation({
    summary: '闇バイトチェッカー',
    description: 'メッセージや求人投稿が闇バイト（犯罪的アルバイト）の勧誘かどうかを判定します。相談先情報も併せて返却します。',
  })
  @ApiResponse({ status: 201, description: '判定結果（リスクレベル・スコア・理由・相談先情報）' })
  @ApiResponse({ status: 429, description: 'レート制限超過（10回/分）' })
  async checkDarkJob(@Req() req: any, @Body() dto: DarkJobCheckDto) {
    const userId = req.user.id;
    const result = await this.aiService.checkDarkJob(dto.text, dto.source);

    // 履歴保存
    await this.aiService.saveDarkJobCheck(userId, dto.text, 'text', result);

    return {
      ...result,
      consultationContacts: CONSULTATION_CONTACTS,
    };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('dark-job-check-image')
  @ApiOperation({
    summary: '闇バイト画像チェッカー（OCR付き）',
    description: 'スクリーンショットや写真からOCRでテキストを抽出し、闇バイト判定を実行します。',
  })
  @ApiResponse({ status: 201, description: '判定結果（OCR抽出テキスト付き）' })
  @ApiResponse({ status: 429, description: 'レート制限超過（5回/分）' })
  async checkDarkJobImage(@Req() req: any, @Body() dto: DarkJobImageCheckDto) {
    const userId = req.user.id;
    const result = await this.aiService.checkDarkJobImage(
      dto.imageBase64,
      dto.source,
    );

    // 履歴保存
    await this.aiService.saveDarkJobCheck(
      userId,
      result.extractedText || '(画像入力)',
      'image',
      result,
    );

    return {
      ...result,
      consultationContacts: CONSULTATION_CONTACTS,
    };
  }

  @Get('dark-job-history')
  @ApiOperation({
    summary: '闇バイトチェック履歴',
    description: 'ユーザーの闇バイトチェック履歴を取得します（直近20件）。',
  })
  @ApiQuery({ name: 'limit', required: false, description: '取得件数（デフォルト: 20）' })
  @ApiResponse({ status: 200, description: 'チェック履歴一覧' })
  async getDarkJobHistory(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.id;
    return this.aiService.getDarkJobHistory(userId, limit ? parseInt(limit, 10) : 20);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('voice-analyze')
  @ApiOperation({
    summary: 'AI音声解析（transcript受信）',
    description: '音声認識テキストを受信し、AI詐欺解析を実行。結果をイベントとして保存し、家族に通知します。',
  })
  @ApiResponse({ status: 201, description: '音声解析結果（リスクスコア・詐欺種別・要約）' })
  @ApiResponse({ status: 429, description: 'レート制限超過（5回/分）' })
  async voiceAnalyze(@Req() req: any, @Body() dto: VoiceAnalyzeDto) {
    const userId = req.user.id;
    return this.aiService.voiceAnalyze(userId, dto.transcript);
  }
}
