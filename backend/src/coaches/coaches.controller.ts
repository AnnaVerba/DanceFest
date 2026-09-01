import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoachesService } from './coaches.service';

@ApiTags('coaches')
@Controller('coaches')
export class CoachesController {
  constructor(private readonly coachesService: CoachesService) {}

  @ApiOperation({ summary: 'List all coaches' })
  @ApiResponse({ status: 200, description: 'Coaches returned.' })
  @Get()
  async findAll() {
    const coaches = await this.coachesService.findAll();
    return coaches.map((coach) => ({
      id: coach.id,
      firstName: coach.firstName,
      lastName: coach.lastName,
      schoolId: coach.schoolId,
    }));
  }
}
