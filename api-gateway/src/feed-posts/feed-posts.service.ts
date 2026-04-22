import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedPostEntity } from './feed-post.entity';
import { CreatePostInput } from './feed-posts.model';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class FeedPostsService {
  constructor(
    @InjectRepository(FeedPostEntity)
    private readonly feedRepo: Repository<FeedPostEntity>,
    private readonly redisService: RedisService,
  ) { }

  async getGlobalFeed() {
    return this.feedRepo.find({
      where: { scope: 'global' },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async getGroupFeed(groupId: string) {
    return this.feedRepo.find({
      where: { groupId },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async getPostById(postId: string) {
    return this.feedRepo.findOne({ where: { id: postId } });
  }

  async createPost(input: CreatePostInput) {
    const postData: any = {
      authorId: (input.authorId && input.authorId.length > 5) ? input.authorId : '00000000-0000-0000-0000-000000000000',
      contentText: input.contentText || '(İçerik girilmedi)',
      scope: input.scope || 'global',
      postType: input.postType || 'text',
      isSystem: input.isSystem || false,
      isPinned: input.isPinned || false,
      reactions: {},
      metadata: input.metadata || {},
    };
    if (input.scope === 'group' && input.groupId) {
      postData.groupId = input.groupId;
    }
    const post = this.feedRepo.create(postData) as unknown as FeedPostEntity;
    const savedPost = await this.feedRepo.save(post);

    // Sync with AI Worker
    await this.redisService.pushTaskToQueue('handle_social_content', {
      type: 'post',
      id: savedPost.id,
      text: savedPost.contentText,
      userId: savedPost.authorId,
      groupId: savedPost.groupId
    });

    return savedPost;
  }

  async togglePin(postId: string, isPinned: boolean) {
    const post = await this.feedRepo.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    post.isPinned = isPinned;
    return this.feedRepo.save(post);
  }

  async deletePost(postId: string): Promise<boolean> {
    const result = await this.feedRepo.delete(postId);
    return result.affected !== 0;
  }

  async addReaction(postId: string, userId: string, reactionType: string) {
    const post = await this.feedRepo.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const reactions: Record<string, string[]> = post.reactions || {};
    if (!reactions[reactionType]) {
      reactions[reactionType] = [];
    }

    if (!reactions[reactionType].includes(userId)) {
      reactions[reactionType].push(userId);
    }

    post.reactions = reactions;
    return this.feedRepo.save(post);
  }

  async removeReaction(postId: string, userId: string, reactionType: string) {
    const post = await this.feedRepo.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const reactions: Record<string, string[]> = post.reactions || {};
    if (reactions[reactionType]) {
      reactions[reactionType] = reactions[reactionType].filter(id => id !== userId);
      if (reactions[reactionType].length === 0) {
        delete reactions[reactionType];
      }
    }

    post.reactions = reactions;
    return this.feedRepo.save(post);
  }

  async addComment(postId: string, userId: string, authorName: string, text: string) {
    const post = await this.feedRepo.findOne({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const metadata = post.metadata || {};
    if (!metadata.comments) {
      metadata.comments = [];
    }

    metadata.comments.push({
      id: Math.random().toString(36).substring(7),
      userId,
      authorName,
      text,
      createdAt: new Date().toISOString(),
    });

    post.metadata = metadata;
    const updatedPost = await this.feedRepo.save(post);

    // Sync with AI Worker (Comment as an interaction)
    await this.redisService.pushTaskToQueue('handle_social_content', {
      type: 'comment',
      id: metadata.comments[metadata.comments.length - 1].id,
      text,
      userId,
      postId: updatedPost.id
    });

    return updatedPost;
  }
}
