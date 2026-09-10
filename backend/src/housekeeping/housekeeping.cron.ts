import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HousekeepingService } from './housekeeping.service';
import { HOUSEKEEPING_CRON_EXPRESSION } from './housekeeping.constants';

// worker mode only (see HousekeepingModule): fires the sweeps on a timer.
@Injectable()
export class HousekeepingCron {
  constructor(private readonly housekeeping: HousekeepingService) {}

  @Cron(HOUSEKEEPING_CRON_EXPRESSION)
  async run(): Promise<void> {
    await this.housekeeping.runAll();
  }
}
