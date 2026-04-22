import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedPostEntity } from './feed-post.entity';
import { FeedPostsService } from './feed-posts.service';
import { FeedPostsResolver } from './feed-posts.resolver';

import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedPostEntity]),
    RedisModule,
  ],
  providers: [FeedPostsService, FeedPostsResolver],
  exports: [FeedPostsService],
})
export class FeedPostsModule {}
