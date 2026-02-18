import { IsEnum, IsOptional, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const EVENT_TYPES = [
  'scam_button',
  'auto_forward',
  'ai_assistant',
  'realtime_alert',
  'conversation_ai',
  'remote_block',
  'statistics',
  'dark_job_check',
  'emergency_sos',
] as const;

type EventType = (typeof EVENT_TYPES)[number];

const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
type AlertSeverity = (typeof SEVERITY_LEVELS)[number];

export class CreateEventDto {
  @ApiProperty({
    enum: EVENT_TYPES,
    description: 'イベントタイプ（F1〜F9）',
  })
  @IsEnum(EVENT_TYPES)
  type: EventType;

  @ApiProperty({
    enum: SEVERITY_LEVELS,
    description: '重大度（critical / high / medium / low）',
  })
  @IsEnum(SEVERITY_LEVELS)
  severity: AlertSeverity;

  @ApiProperty({ required: false, description: 'イベント付随データ（JSON）' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiProperty({ required: false, description: '緯度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false, description: '経度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
