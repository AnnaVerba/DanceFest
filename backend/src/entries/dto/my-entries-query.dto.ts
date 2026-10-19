import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import {
  MONTH_PATTERN,
  MY_ENTRIES_SORT_ORDERS,
  YEAR_PATTERN,
} from '../my-entries.constants';
import type { MyEntriesSortOrder } from '../my-entries-page.interface';

export class MyEntriesQueryDto {
  @ApiPropertyOptional({ example: '0', description: 'Zero-based page.' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional({
    example: 'Шевчук',
    description:
      'Free text over dancers, trainers and competitions; ignored under 3 characters.',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Only this competition.' })
  @IsOptional()
  @IsString()
  competitionId?: string;

  @ApiPropertyOptional({
    example: '2026',
    description: 'Only competitions starting in this year.',
  })
  @IsOptional()
  @Matches(YEAR_PATTERN)
  year?: string;

  @ApiPropertyOptional({
    example: '11',
    description: "Only competitions starting in this month ('01'–'12').",
  })
  @IsOptional()
  @Matches(MONTH_PATTERN)
  month?: string;

  @ApiPropertyOptional({ enum: MY_ENTRIES_SORT_ORDERS })
  @IsOptional()
  @IsIn(MY_ENTRIES_SORT_ORDERS)
  sort?: MyEntriesSortOrder;
}
