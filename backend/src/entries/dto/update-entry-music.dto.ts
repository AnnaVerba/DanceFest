import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_MUSIC_NAME_LENGTH = 255;

export class UpdateEntryMusicDto {
  @ApiProperty({ example: '213_Fesenko_Oriental.mp3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_MUSIC_NAME_LENGTH)
  musicName: string;
}
