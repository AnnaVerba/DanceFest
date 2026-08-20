import { PartialType } from '@nestjs/swagger';
import { CreateNominationDto } from './create-nomination.dto';

// Часткове оновлення: організатор правитиме здебільшого ціну й ліміт, а не
// перескладатиме номінацію цілком.
export class UpdateNominationDto extends PartialType(CreateNominationDto) {}
