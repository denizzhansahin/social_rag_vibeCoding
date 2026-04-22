import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupEntity, GroupMemberEntity } from './group.entity';
import { GroupsService } from './groups.service';
import { GroupsResolver } from './groups.resolver';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([GroupEntity, GroupMemberEntity]), RedisModule],
  providers: [GroupsService, GroupsResolver],
  exports: [GroupsService],
})
export class GroupsModule {}
