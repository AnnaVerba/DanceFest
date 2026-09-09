import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveExitDto {
  @ApiProperty({ description: 'Вихід (entry), який переносимо.' })
  @IsUUID()
  entryId: string;

  @ApiProperty({ description: 'Відділення, у яке переносимо.' })
  @IsUUID()
  targetSectionId: string;
}
