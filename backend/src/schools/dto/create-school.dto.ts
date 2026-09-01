import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Танцювальна студія "Ритм"' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
