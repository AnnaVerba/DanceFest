import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpsertPaymentDetailsDto {
  @ApiPropertyOptional({ example: 'ФОП Ковальчук О. М.' })
  @IsOptional()
  @IsString()
  beneficiary?: string;

  @ApiPropertyOptional({
    example: 'UA123456780000026007233566001',
    description: 'Номер картки або IBAN отримувача — одне поле, як на формі.',
  })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiPropertyOptional({ example: 'АТ КБ «ПриватБанк»' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '3214567890' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({
    example: 'Організаційний внесок за участь у конкурсі «Зірки Танцполу 2026»',
  })
  @IsOptional()
  @IsString()
  destination?: string;
}
