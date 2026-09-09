import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RecalculateScheduleDto {
  @ApiPropertyOptional({
    description:
      'Одне відділення. Без нього перераховуються всі відділення конкурсу.',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
