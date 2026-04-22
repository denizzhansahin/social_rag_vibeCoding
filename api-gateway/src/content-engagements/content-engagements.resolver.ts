import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ContentEngagementsService } from './content-engagements.service';
import { ContentEngagement } from './entities/content-engagement.entity';
import { CreateContentEngagementInput } from './dto/create-content-engagement.input';

@Resolver(() => ContentEngagement)
export class ContentEngagementsResolver {
  constructor(private readonly service: ContentEngagementsService) {}

  @Mutation(() => ContentEngagement)
  createEngagement(@Args('input') input: CreateContentEngagementInput) {
    return this.service.create(input);
  }

  @Query(() => [ContentEngagement], { name: 'recentEngagements' })
  findAll() {
    return this.service.findAll();
  }

  @Query(() => [ContentEngagement], { name: 'getUserEngagements' })
  findByUser(@Args('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}
