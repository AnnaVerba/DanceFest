import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { PaymentDetails } from './payment-details.model';
import { PaymentDetailsController } from './payment-details.controller';
import { PaymentDetailsService } from './payment-details.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Competition, CompetitionAdmin, PaymentDetails]),
  ],
  controllers: [PaymentDetailsController],
  providers: [PaymentDetailsService],
})
export class PaymentDetailsModule {}
