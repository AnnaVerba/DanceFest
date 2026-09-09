import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpdateMusicDeadlineDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  musicDeadline: string;
}
