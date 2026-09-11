import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Entry } from '../entries/entry.model';
import { Track } from '../tracks/track.model';
import { CompetitionsService } from '../competitions/competitions.service';
import { CompetitionRulesService } from '../competition-rules/competition-rules.service';
import type { AccessLevel } from '../auth/access-level.enum';
import type { OverageEntryView, OveragesResponse } from './overage-entry.view';

@Injectable()
export class OveragesService {
  constructor(
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    @InjectModel(Track) private readonly trackModel: typeof Track,
    private readonly competitionsService: CompetitionsService,
    private readonly competitionRulesService: CompetitionRulesService,
  ) {}

  // Entries whose measured track duration exceeds their effective time
  // limit. An overage stays a warning until the organizer records purchased
  // extra time for it (see EntriesService.updateExtraTime) — that decision
  // never happens here, so an entry without a measured duration (no track
  // uploaded yet) is left out rather than guessed at.
  async list(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<OveragesResponse> {
    await this.competitionsService.loadAndAssertCanEdit(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const rules = await this.competitionRulesService.getRules(competitionId);

    const entries = await this.entryModel.findAll({
      where: { competitionId },
      order: [['number', 'ASC']],
    });
    const durationByEntryId = await this.loadDurations(entries);

    const limitCache = new Map<string, number>();
    const items: OverageEntryView[] = [];
    for (const entry of entries) {
      const durationSec = durationByEntryId.get(entry.id);
      if (durationSec === undefined) continue;

      const limitSec = await this.competitionRulesService.resolveEffectiveLimit(
        entry,
        rules,
        limitCache,
      );
      const overageSec = Math.max(0, durationSec - limitSec);
      if (overageSec === 0) continue;

      items.push({
        entryId: entry.id,
        number: entry.number,
        dancerName: entry.routineName,
        league: entry.league,
        limitSec,
        durationSec,
        overageSec,
        purchasedSec: entry.purchasedExtraSeconds,
        extraFee: Number(entry.extraFee),
      });
    }

    return { items };
  }

  private async loadDurations(entries: Entry[]): Promise<Map<string, number>> {
    const entryIds = entries.map((entry) => entry.id);
    if (entryIds.length === 0) return new Map();

    const tracks = await this.trackModel.findAll({
      where: { performanceId: { [Op.in]: entryIds } },
    });
    return new Map(
      tracks.map((track) => [track.performanceId, track.durationSeconds]),
    );
  }
}
