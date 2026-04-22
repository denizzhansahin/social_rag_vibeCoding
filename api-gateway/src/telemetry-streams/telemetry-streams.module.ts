import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryStreamsService } from './telemetry-streams.service';
import { TelemetryStreamsResolver } from './telemetry-streams.resolver';
import { TelemetryStream } from './entities/telemetry-stream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TelemetryStream])],
  providers: [TelemetryStreamsResolver, TelemetryStreamsService],
})
export class TelemetryStreamsModule {}
