import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('feed_posts')
export class FeedPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId?: string;

  @Column({ name: 'content_text', type: 'text' })
  contentText: string;

  @Column({ name: 'post_type', type: 'varchar', default: 'text' })
  postType: string;

  @Column({ type: 'varchar', default: 'global' })
  scope: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  attachments: any;

  @Column({ type: 'jsonb', default: '{}' })
  reactions: any;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
