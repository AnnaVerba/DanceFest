import { Module } from '@nestjs/common';
import { CompetitionsResolver } from './competitions.resolver';
import { CompetitionsService } from './competitions.service';

@Module({
  providers: [CompetitionsResolver, CompetitionsService],
})
export class CompetitionsModule {}
