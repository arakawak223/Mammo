import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  validateSync,
  Min,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  AI_SERVICE_URL?: string;

  @IsOptional()
  @IsString()
  FIREBASE_PROJECT_ID?: string;

  @IsOptional()
  @IsString()
  FIREBASE_SERVICE_ACCOUNT?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  PORT?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `環境変数のバリデーションエラー:\n${errors
        .map(
          (e) =>
            `  - ${e.property}: ${Object.values(e.constraints || {}).join(', ')}`,
        )
        .join('\n')}`,
    );
  }
  return validatedConfig;
}
