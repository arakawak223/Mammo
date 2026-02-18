import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class DarkJobCheckDto {
  text: string;
}

class VoiceAnalyzeDto {
  transcript: string;
}

const CONSULTATION_CONTACTS = [
  { name: '警察相談ダイヤル', phone: '#9110', description: '警察に犯罪関連の相談ができます' },
  { name: '消費者ホットライン', phone: '188', description: '消費者トラブルの相談窓口' },
  { name: '法テラス', phone: '0570-078374', description: '無料法律相談' },
  { name: '若者の悩み相談', phone: '0120-86-7867', description: '24時間対応の相談窓口' },
];

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('dark-job-check')
  @ApiOperation({ summary: '闇バイトチェッカー' })
  async checkDarkJob(@Body() dto: DarkJobCheckDto) {
    const result = await this.aiService.checkDarkJob(dto.text);
    return {
      ...result,
      consultationContacts: CONSULTATION_CONTACTS,
    };
  }

  @Post('voice-analyze')
  @ApiOperation({ summary: 'AI音声解析（transcript受信）' })
  async voiceAnalyze(@Req() req: any, @Body() dto: VoiceAnalyzeDto) {
    const userId = req.user.id;
    return this.aiService.voiceAnalyze(userId, dto.transcript);
  }
}
