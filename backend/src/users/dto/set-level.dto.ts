import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AccessLevel, ACCESS_LEVELS } from '../../auth/access-level.enum';

export class SetLevelDto {
  @ApiProperty({ enum: ACCESS_LEVELS, example: AccessLevel.ORGANIZER })
  @IsIn(ACCESS_LEVELS as readonly string[])
  level: AccessLevel;
}
