import { PartialType } from '@nestjs/swagger';
import { CreateNominationDto } from './create-nomination.dto';

export class UpdateNominationDto extends PartialType(CreateNominationDto) {}
