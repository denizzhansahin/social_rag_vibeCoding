import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SocialObjectsService } from './social-objects.service';
import { SocialObject, CreateSocialObjectInput } from './social-objects.model';

@Resolver(() => SocialObject)
export class SocialObjectsResolver {
  constructor(private readonly service: SocialObjectsService) {}

  @Query(() => [SocialObject], { name: 'getHomeFeed' })
  async getHomeFeed() {
    return this.service.getFeed();
  }

  @Mutation(() => SocialObject)
  async createSocialObject(
    @Args('input') input: CreateSocialObjectInput,
  ) {
    return this.service.createObject(input);
  }
}
