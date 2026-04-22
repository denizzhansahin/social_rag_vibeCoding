import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEngagementsService } from './content-engagements.service';
import { ContentEngagementsResolver } from './content-engagements.resolver';
import { ContentEngagement } from './entities/content-engagement.entity';
import { FeedPostEntity } from '../feed-posts/feed-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContentEngagement, FeedPostEntity])],
  providers: [ContentEngagementsResolver, ContentEngagementsService],
})
export class ContentEngagementsModule {}
