import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TelemetryEventType } from '../enums/event-type.enum';

registerEnumType(TelemetryEventType, { name: 'TelemetryEventType' });

@ObjectType()
@Entity('telemetry_streams')
export class TelemetryStream {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @Field()
  @Column({ name: 'session_id' })
  sessionId: string;

  @Field(() => TelemetryEventType)
  @Column({ type: 'enum', enum: TelemetryEventType, name: 'event_type' })
  eventType: TelemetryEventType;

  @Field()
  @Column({ name: 'target_path' })
  targetPath: string;

  // JSON alanı (stringe cast edilebilir veya GraphQLJSONObject kullanılabilir, ancak type-grapqhql json paket sorunlarını engellemek için basic object/string kullanıyoruz. Code-First Apollo default JSON destekler).
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metrics?: object;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
