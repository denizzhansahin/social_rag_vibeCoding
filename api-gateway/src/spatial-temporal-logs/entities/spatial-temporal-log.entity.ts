import { ObjectType, Field, ID, registerEnumType, Int } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { PunctualityStatus } from '../enums/punctuality-status.enum';

registerEnumType(PunctualityStatus, { name: 'PunctualityStatus' });

@ObjectType()
@Entity('spatial_temporal_logs')
export class SpatialTemporalLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @Column({ name: 'session_id' })
  sessionId: string;

  @Field()
  @Column({ name: 'terminal_id' })
  terminalId: string;

  @Field()
  @Column({ name: 'physical_zone' })
  physicalZone: string;

  @Field()
  @Column({ name: 'scan_time', type: 'timestamptz' })
  scanTime: Date;

  @Field({ nullable: true })
  @Column({ name: 'expected_time', type: 'timestamptz', nullable: true })
  expectedTime?: Date;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'delay_minutes', nullable: true })
  delayMinutes?: number;

  @Field(() => PunctualityStatus)
  @Column({ type: 'enum', enum: PunctualityStatus })
  punctuality: PunctualityStatus;

  @Field(() => String, { nullable: true })
  @Column({ name: 'spatial_context', type: 'jsonb', nullable: true })
  spatialContext?: object;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
