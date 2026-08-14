import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { PaymentDetailsService } from './payment-details.service';
import { UpsertPaymentDetailsDto } from './dto/upsert-payment-details.dto';

@ApiTags('payment-details')
@Controller('competitions/:competitionId/payment-details')
export class PaymentDetailsController {
  constructor(private readonly paymentDetailsService: PaymentDetailsService) {}

  // Публічний: реквізити мають бути видні учасникам на сторінці конкурсу,
  // щоб вони знали, куди переказати внесок.
  @ApiOperation({ summary: "Get a competition's payment details" })
  @ApiResponse({
    status: 200,
    description: 'Payment details returned, or null if not set yet.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get()
  get(@Param('competitionId') competitionId: string) {
    return this.paymentDetailsService.get(competitionId);
  }

  @ApiOperation({
    summary: "Create or replace a competition's payment details",
  })
  @ApiResponse({ status: 200, description: 'Payment details saved.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or neither cardNumber nor iban was provided.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put()
  upsert(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpsertPaymentDetailsDto,
  ) {
    return this.paymentDetailsService.upsert(competitionId, admin.id, dto);
  }
}
