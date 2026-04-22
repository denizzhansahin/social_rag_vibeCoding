import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('master_identities')
export class UserEntity {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: ['participant', 'mentor', 'teacher', 'admin'], default: 'participant' })
  role: string;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'inactive'], default: 'active' })
  status: string;

  @Column({ name: 'qr_hash', nullable: true })
  qrHash: string;

  @Column({ name: 'cognitive_profile', type: 'jsonb', default: '{}' })
  cognitiveProfile: any;

  @Column({ name: 'telemetry_summary', type: 'jsonb', default: '{}' })
  telemetrySummary: any;

  @Column({ name: 'performance_metrics', type: 'jsonb', default: '{}' })
  performanceMetrics: any;

  @Column({ name: 'computed_tags', type: 'jsonb', default: '{"system_tags":[],"trait_flags":[]}' })
  computedTags: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'social_links', type: 'jsonb', default: '{}' })
  socialLinks: any;

  @Column({ name: 'has_completed_onboarding', type: 'boolean', default: false })
  hasCompletedOnboarding: boolean;
}
