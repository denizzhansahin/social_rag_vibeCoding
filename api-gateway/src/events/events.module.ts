import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsResolver } from './events.resolver';
import { EventsSchedulerService } from './events.scheduler';
import { EventEntity } from './event.entity';
import { EventAssignmentEntity } from './event-assignment.entity';
import { EventGroupEntity } from './event-group.entity';
import { FeedPostEntity } from '../feed-posts/feed-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, EventAssignmentEntity, EventGroupEntity, FeedPostEntity])],
  providers: [EventsService, EventsResolver, EventsSchedulerService],
  exports: [EventsService],
})
export class EventsModule { }
