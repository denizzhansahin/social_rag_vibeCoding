import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('social_objects')
export class SocialObjectEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // text, image, poll, slider, free_text vs
  @Column({ name: 'object_type', type: 'varchar', length: 50 })
  objectType: string;

  @Column({ name: 'ui_payload', type: 'jsonb', nullable: true })
  uiPayload: any;

  @Column({ name: 'target_rules', type: 'jsonb', nullable: true })
  targetRules: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'trigger_event', type: 'uuid', nullable: true })
  triggerEvent: string;
}
