import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { AccessLevel } from '../../auth/access-level.enum';

const SELF_UPGRADABLE = [AccessLevel.COACH];

export class UpgradeLevelDto {
  @ApiProperty({ enum: SELF_UPGRADABLE, example: AccessLevel.COACH })
  @IsIn(SELF_UPGRADABLE)
  level: AccessLevel.COACH;

  @ApiProperty({
    required: false,
    description: 'The school the coach belongs to (required from the UI).',
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
