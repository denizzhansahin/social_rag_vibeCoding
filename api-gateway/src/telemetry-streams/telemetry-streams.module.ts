import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryStreamsService } from './telemetry-streams.service';
import { TelemetryStreamsResolver } from './telemetry-streams.resolver';
import { TelemetryStream } from './entities/telemetry-stream.entity';
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
@Module({
  imports: [TypeOrmModule.forFeature([TelemetryStream])],
  providers: [TelemetryStreamsResolver, TelemetryStreamsService],
})
export class TelemetryStreamsModule {}
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.