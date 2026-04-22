import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SpatialTemporalLogsService } from './spatial-temporal-logs.service';
import { SpatialTemporalLog } from './entities/spatial-temporal-log.entity';
import { CreateSpatialTemporalLogInput } from './dto/create-spatial-temporal-log.input';
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AttendanceStats {
  @Field(() => Int) onTime: number;
  @Field(() => Int) late: number;
  @Field(() => Int) absent: number;
  @Field(() => Int) total: number;
}

@Resolver(() => SpatialTemporalLog)
export class SpatialTemporalLogsResolver {
  constructor(private readonly service: SpatialTemporalLogsService) {}

  /** Tam detaylı yoklama kaydı (admin panel) */
  @Mutation(() => SpatialTemporalLog)
  createSpatialLog(@Args('input') input: CreateSpatialTemporalLogInput) {
    return this.service.create(input);
  }

  /** QR Scan veya Manuel Kod ile hızlı yoklama (kullanıcı uygulaması) */
  @Mutation(() => SpatialTemporalLog)
  quickCheckin(
    @Args('userId') userId: string,
    @Args('eventCode') eventCode: string,
  ) {
    return this.service.quickCheckin(userId, eventCode);
  }

  @Query(() => [SpatialTemporalLog], { name: 'recentSpatialLogs' })
  findAll() {
    return this.service.findAll();
  }

  /** Bir etkinliğin yoklama kayıtları */
  @Query(() => [SpatialTemporalLog], { name: 'getEventAttendance' })
  getEventAttendance(@Args('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  /** Bir kullanıcının yoklama geçmişi */
  @Query(() => [SpatialTemporalLog], { name: 'getUserAttendance' })
  getUserAttendance(@Args('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  /** Etkinlik bazlı yoklama istatistikleri */
  @Query(() => AttendanceStats, { name: 'getAttendanceStats' })
  getAttendanceStats(@Args('sessionId') sessionId: string) {
    return this.service.getAttendanceStats(sessionId);
  }
}
