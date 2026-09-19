import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MoveNominationDto {
  @ApiProperty({
    description:
      'Ключ групи номінації в розкладі (nominationGroupKey) — усі її виходи переносяться разом.',
  })
  @IsString()
  @IsNotEmpty()
  groupKey: string;

  @ApiProperty({
    description:
      'Відділення, у яке переносимо. Інший майданчик змінює майданчик номінації.',
  })
  @IsUUID()
  targetSectionId: string;
}
