import { Module } from '@nestjs/common';
import { PairingsService } from './pairings.service';
import { PairingsController } from './pairings.controller';

@Module({
  controllers: [PairingsController],
  providers: [PairingsService],
  exports: [PairingsService],
})
export class PairingsModule {}
