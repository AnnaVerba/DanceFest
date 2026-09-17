import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEntryDto } from './create-entry.dto';

// Staff edit of one entry row. Every field is optional — only what is sent
// changes. The legacy single `participantId`, the nomination-by-name
// fallback and the track name (it has its own upload flow) are left out.
export class UpdateEntryDto extends PartialType(
  OmitType(CreateEntryDto, ['participantId', 'nomination', 'musicName']),
) {}
