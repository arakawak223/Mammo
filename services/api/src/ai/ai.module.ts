import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      maxRedirects: 3,
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
