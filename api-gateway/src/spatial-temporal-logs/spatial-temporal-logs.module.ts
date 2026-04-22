import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpatialTemporalLogsService } from './spatial-temporal-logs.service';
import { SpatialTemporalLogsResolver } from './spatial-temporal-logs.resolver';
import { SpatialTemporalLog } from './entities/spatial-temporal-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpatialTemporalLog])],
  providers: [SpatialTemporalLogsResolver, SpatialTemporalLogsService],
})
export class SpatialTemporalLogsModule {}
