import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { Nomination } from './nomination.model';
import { SPECIAL_PRICE_CONFLICT } from './nomination-error-codes';
import { SPECIAL_NAME_PRICE_CONFLICT_MESSAGE } from './nominations.constants';
import { normalizeSpecialName, specialNameLookupKey } from './special-name';
import { specialPriceConflictMessage } from './special-price-conflict';

@Injectable()
export class SpecialNominationGroups {
  constructor(
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
  ) {}

  async canonicalNames(
    competitionId: string,
    rawNames: string[],
    transaction?: Transaction,
  ): Promise<Map<string, string>> {
    const existing = await this.nominationModel.findAll({
      where: { competitionId, isSpecial: true, specialName: { [Op.ne]: null } },
      attributes: ['specialName'],
      order: [['createdAt', 'ASC']],
      transaction,
    });
    const spelling = new Map<string, string>();
    for (const { specialName } of existing) {
      const key = specialNameLookupKey(specialName as string);
      if (!spelling.has(key)) spelling.set(key, specialName as string);
    }

    const canonical = new Map<string, string>();
    for (const raw of rawNames) {
      const normalized = normalizeSpecialName(raw);
      const key = specialNameLookupKey(normalized);
      if (!spelling.has(key)) spelling.set(key, normalized);
      canonical.set(raw, spelling.get(key) as string);
    }
    return canonical;
  }

  async findGroupPrice(
    competitionId: string,
    specialName: string,
    transaction?: Transaction,
  ): Promise<number | null> {
    const member = await this.nominationModel.findOne({
      where: {
        competitionId,
        isSpecial: true,
        specialName,
        price: { [Op.ne]: null },
      },
      attributes: ['price'],
      transaction,
    });
    return member === null ? null : Number(member.price);
  }

  async alignPrice(
    competitionId: string,
    specialName: string,
    price: number | null,
    transaction: Transaction,
  ): Promise<void> {
    await this.nominationModel.update(
      { price },
      { where: { competitionId, isSpecial: true, specialName }, transaction },
    );
  }

  async assign(
    competitionId: string,
    attributesList: CreationAttributes<Nomination>[],
    transaction: Transaction,
  ): Promise<Map<string, number>> {
    const specials = attributesList.filter((a) => a.isSpecial);
    if (specials.length === 0) return new Map();

    const canonical = await this.canonicalNames(
      competitionId,
      specials.map((a) => a.specialName as string),
      transaction,
    );
    const explicit = new Map<string, number>();
    for (const attributes of specials) {
      const name = canonical.get(attributes.specialName as string) as string;
      attributes.specialName = name;
      if (attributes.price === null || attributes.price === undefined) continue;
      const price = Number(attributes.price);
      const known = explicit.get(name);
      if (known !== undefined && known !== price) {
        throw new BadRequestException(
          `${SPECIAL_NAME_PRICE_CONFLICT_MESSAGE} «${name}»`,
        );
      }
      explicit.set(name, price);
    }

    const groupPrices = new Map<string, number | null>();
    for (const attributes of specials) {
      const name = attributes.specialName as string;
      if (!groupPrices.has(name)) {
        groupPrices.set(
          name,
          await this.findGroupPrice(competitionId, name, transaction),
        );
      }
      const groupPrice = groupPrices.get(name) as number | null;
      const explicitPrice = explicit.get(name);
      if (
        explicitPrice !== undefined &&
        groupPrice !== null &&
        explicitPrice !== groupPrice
      ) {
        throw new ConflictException({
          code: SPECIAL_PRICE_CONFLICT,
          message: specialPriceConflictMessage(name, groupPrice),
        });
      }
      const price = explicitPrice ?? groupPrice;
      if (price !== null) attributes.price = price;
    }
    return explicit;
  }

  async alignExplicit(
    competitionId: string,
    explicit: Map<string, number>,
    transaction: Transaction,
  ): Promise<void> {
    for (const [name, price] of explicit) {
      await this.alignPrice(competitionId, name, price, transaction);
    }
  }
}
