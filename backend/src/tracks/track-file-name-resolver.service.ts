import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Entry } from '../entries/entry.model';
import { Nomination } from '../nominations/nomination.model';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
import { buildTrackFileName } from '../music-export/build-track-filename';
import type { TrackFileNameInput } from '../music-export/build-track-filename';

const STYLE_CATEGORY_TYPE = 'style';

// Resolves one entry's track file name at upload time, in the same format
// (and via the same buildTrackFileName) MusicExportProcessor uses for the
// export archive — see that file's comment for the naming rule itself.
@Injectable()
export class TrackFileNameResolver {
  constructor(
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async resolve(entry: Entry, extension: string): Promise<string> {
    const [style, soloParticipant] = await Promise.all([
      this.resolveStyle(entry),
      this.resolveSoloParticipant(entry),
    ]);
    const input: TrackFileNameInput = {
      entryNumber: entry.number,
      soloParticipant,
      routineName: entry.routineName,
      league: entry.league,
      style,
      extension,
    };
    return buildTrackFileName(input);
  }

  // Style is a Category (type='style') reached via the entry's nomination —
  // same lookup MusicExportProcessor.resolveStyles does per-entry instead
  // of in bulk, since this resolves a single upload at a time.
  private async resolveStyle(entry: Entry): Promise<string | null> {
    if (!entry.nominationId) return null;
    const nomination = await this.nominationModel.findByPk(entry.nominationId);
    if (!nomination) return null;
    const styleCategory = await this.categoryModel.findOne({
      where: {
        id: { [Op.in]: nomination.categoryIds },
        type: STYLE_CATEGORY_TYPE,
      },
    });
    return styleCategory?.name ?? null;
  }

  // Only for solo entries — matches MusicExportProcessor.resolveSoloNames.
  private async resolveSoloParticipant(
    entry: Entry,
  ): Promise<{ firstName: string; lastName: string } | null> {
    const isSolo = (entry.participantIds?.length ?? 0) <= 1 && entry.participantId;
    if (!isSolo) return null;
    const user = await this.userModel.findByPk(entry.participantId as string);
    return user ? { firstName: user.firstName, lastName: user.lastName } : null;
  }
}
