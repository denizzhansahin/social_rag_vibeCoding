import { Module } from '@nestjs/common';
import { Neo4jGraphService } from './neo4j-graph.service';
import { Neo4jGraphResolver } from './neo4j-graph.resolver';
import { RedisModule } from '../common/redis/redis.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingResult } from './matching-result.entity';

@Module({
  imports: [RedisModule, TypeOrmModule.forFeature([MatchingResult])],
  providers: [Neo4jGraphResolver, Neo4jGraphService],
  exports: [Neo4jGraphService],
})
export class Neo4jGraphModule {}
