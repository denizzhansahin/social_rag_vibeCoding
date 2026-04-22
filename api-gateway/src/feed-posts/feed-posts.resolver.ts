import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { FeedPostsService } from './feed-posts.service';
import { FeedPost, CreatePostInput } from './feed-posts.model';

@Resolver()
export class FeedPostsResolver {
  constructor(private readonly feedService: FeedPostsService) { }

  @Query(() => [FeedPost], { name: 'getGlobalFeed' })
  async getGlobalFeed() {
    return this.feedService.getGlobalFeed();
  }

  @Query(() => [FeedPost], { name: 'getGroupFeed' })
  async getGroupFeed(@Args('groupId') groupId: string) {
    return this.feedService.getGroupFeed(groupId);
  }

  @Query(() => FeedPost, { name: 'getFeedPost', nullable: true })
  async getFeedPost(@Args('postId') postId: string) {
    return this.feedService.getPostById(postId);
  }

  @Mutation(() => FeedPost)
  async createFeedPost(@Args('input') input: CreatePostInput) {
    return this.feedService.createPost(input);
  }

  @Mutation(() => FeedPost)
  async togglePostPin(@Args('postId') postId: string, @Args('isPinned') isPinned: boolean) {
    return this.feedService.togglePin(postId, isPinned);
  }

  @Mutation(() => Boolean)
  async deleteFeedPost(@Args('postId') postId: string) {
    return this.feedService.deletePost(postId);
  }

  @Mutation(() => FeedPost)
  async addReaction(
    @Args('postId') postId: string,
    @Args('userId') userId: string,
    @Args('reactionType') reactionType: string,
  ) {
    return this.feedService.addReaction(postId, userId, reactionType);
  }

  @Mutation(() => FeedPost)
  async addComment(
    @Args('postId') postId: string,
    @Args('userId') userId: string,
    @Args('authorName') authorName: string,
    @Args('text') text: string,
  ) {
    return this.feedService.addComment(postId, userId, authorName, text);
  }

  @Mutation(() => FeedPost)
  async removeReaction(
    @Args('postId') postId: string,
    @Args('userId') userId: string,
    @Args('reactionType') reactionType: string,
  ) {
    return this.feedService.removeReaction(postId, userId, reactionType);
  }
}
