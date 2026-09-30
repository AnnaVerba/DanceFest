import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

// A school for a coach-level user; refused below coach level.
export class SetSchoolDto {
  @ApiPropertyOptional({ description: 'Coach level and above only.' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
