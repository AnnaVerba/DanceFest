import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertPaymentDetailsDto {
  @ApiProperty({ example: 'ФОП Ковальчук О. М.' })
  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  @ApiPropertyOptional({
    example: '4441111122223333',
    description:
      'Номер картки отримувача для P2P-переказу. Разом з iban — має бути вказано хоча б одне поле.',
  })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ example: 'UA123456780000026007233566001' })
  @IsOptional()
  @IsString()
  iban?: string;

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
