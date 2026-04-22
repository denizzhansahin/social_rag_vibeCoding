import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { EventEntity } from './event.entity';

@Entity('event_groups')
export class EventGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => EventEntity, (event) => event.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity;
}
