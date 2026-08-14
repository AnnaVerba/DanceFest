import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { PaymentDetails } from './payment-details.model';
import { UpsertPaymentDetailsDto } from './dto/upsert-payment-details.dto';

@Injectable()
export class PaymentDetailsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(PaymentDetails)
    private readonly paymentDetailsModel: typeof PaymentDetails,
  ) {}

  // Публічний доступ: реквізити мають бути видні учасникам, щоб вони знали,
  // куди переказати внесок за участь.
  async get(competitionId: string): Promise<PaymentDetails | null> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    return this.paymentDetailsModel.findOne({ where: { competitionId } });
  }

  async upsert(
    competitionId: string,
    requesterId: string,
    dto: UpsertPaymentDetailsDto,
  ): Promise<PaymentDetails> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const existing = await this.paymentDetailsModel.findOne({
      where: { competitionId },
    });

    const attrs = {
      competitionId,
      adminId: requesterId,
      beneficiary: dto.beneficiary.trim(),
      account: dto.account.trim(),
      bankName: dto.bankName?.trim() || null,
      taxId: dto.taxId?.trim() || null,
      destination: dto.destination?.trim() || null,
    };

    if (existing) {
      return existing.update(attrs);
    }
    return this.paymentDetailsModel.create(
      attrs as CreationAttributes<PaymentDetails>,
    );
  }

  /** Керувати реквізитами може власник або будь-який адмін, доданий до команди. */
  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
    return competition;
  }
}
