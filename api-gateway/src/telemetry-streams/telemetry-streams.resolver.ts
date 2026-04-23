import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { TelemetryStreamsService } from './telemetry-streams.service';
import { TelemetryStream } from './entities/telemetry-stream.entity';
import { CreateTelemetryStreamInput } from './dto/create-telemetry-stream.input';
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
@Resolver(() => TelemetryStream)
export class TelemetryStreamsResolver {
  constructor(private readonly service: TelemetryStreamsService) {}

  @Mutation(() => TelemetryStream)
  createTelemetryStream(@Args('input') input: CreateTelemetryStreamInput) {
    return this.service.create(input);
  }

  @Mutation(() => Boolean)
  batchCreateTelemetry(@Args('events', { type: () => [GraphQLJSON] }) events: any[]) {
    return this.service.batchCreate(events);
  }

  @Query(() => [TelemetryStream], { name: 'recentTelemetries' })
  findAll() {
    return this.service.findAll();
  }

  @Query(() => [GraphQLJSON], { name: 'getGlobalTelemetryStats' })
  getGlobalTelemetryStats() {
    return this.service.getGlobalTelemetryStats();
  }
}
