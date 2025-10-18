import { Module } from '@nestjs/common';
import { AggregatorController } from './aggregator.controller';
import { AggregatorService } from './aggregator.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
            timeout:1000
          })
  ],
  controllers: [AggregatorController],
  providers: [AggregatorService],
})
export class AppModule {}
