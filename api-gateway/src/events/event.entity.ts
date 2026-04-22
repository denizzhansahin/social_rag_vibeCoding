import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { EventAssignmentEntity } from './event-assignment.entity';
import { EventGroupEntity } from './event-group.entity';

@Entity('events')
export class EventEntity {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column() title: string;
  @Column({ nullable: true }) description: string;
  @Column({ name: 'event_type', default: 'workshop' }) eventType: string;
  @Column({ nullable: true }) location: string;
  @Column({ name: 'start_time', type: 'timestamptz' }) startTime: Date;
  @Column({ name: 'end_time', type: 'timestamptz', nullable: true }) endTime: Date;
  @Column({ name: 'group_id', type: 'uuid', nullable: true }) groupId: string;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy: string;
  @Column({ type: 'jsonb', default: '{}' }) metadata: any;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @OneToMany(() => EventAssignmentEntity, (assignment) => assignment.event)
  assignments: EventAssignmentEntity[];

  @OneToMany(() => EventGroupEntity, (group) => group.event)
  eventGroups: EventGroupEntity[];
}
