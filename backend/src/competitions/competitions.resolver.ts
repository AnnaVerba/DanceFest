import { Resolver, Query } from '@nestjs/graphql';
import { Competition } from './competition.model';
import { CompetitionsService } from './competitions.service';

@Resolver(() => Competition)
export class CompetitionsResolver {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Query(() => [Competition], { name: 'competitions' })
  findAll(): Competition[] {
    return this.competitionsService.findAll();
  }
}
