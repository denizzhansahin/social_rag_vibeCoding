import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('groups')
export class GroupEntity {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' }) id: string;
  @Column({ name: 'event_id', type: 'uuid', nullable: true }) eventId: string;
  @Column() name: string;
  @Column({ name: 'mentor_id', type: 'uuid', nullable: true }) mentorId: string;
  @Column({ type: 'jsonb', default: '{}' }) metadata: any;
  @Column({ name: 'ai_insights', type: 'jsonb', default: '{}' }) aiInsights: any;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('group_members')
export class GroupMemberEntity {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' }) id: string;
  @Column({ name: 'group_id', type: 'uuid' }) groupId: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt: Date;
}
