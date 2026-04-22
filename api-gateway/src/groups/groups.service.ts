import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GroupEntity, GroupMemberEntity } from './group.entity';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity) private readonly groupRepo: Repository<GroupEntity>,
    @InjectRepository(GroupMemberEntity) private readonly memberRepo: Repository<GroupMemberEntity>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) { }

  async createGroup(input: Partial<GroupEntity>): Promise<GroupEntity> {
    console.log('[GroupsService] Creating group with input:', JSON.stringify(input));
    const group = this.groupRepo.create({
      name: input.name,
      eventId: input.eventId,
      mentorId: input.mentorId,
      metadata: input.metadata || {},
      aiInsights: input.aiInsights || {},
    });
    return this.groupRepo.save(group);
  }

  async updateGroup(id: string, updates: Partial<GroupEntity>): Promise<GroupEntity> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new Error('Grup bulunamadı.');
    
    if (updates.name) group.name = updates.name;
    if (updates.metadata) group.metadata = { ...group.metadata, ...updates.metadata };
    
    return this.groupRepo.save(group);
  }

  async getGroups(): Promise<GroupEntity[]> {
    console.log('[GroupsService] Fetching all groups...');
    const groups = await this.groupRepo.find({ order: { createdAt: 'DESC' } });
    console.log(`[GroupsService] Found ${groups.length} groups.`);
    return groups;
  }

  async getGroupById(id: string): Promise<GroupEntity | null> {
    return this.groupRepo.findOne({ where: { id } });
  }

  async getGroupsByEvent(eventId: string): Promise<GroupEntity[]> {
    return this.groupRepo.find({ where: { eventId } });
  }

  async assignMember(groupId: string, userId: string): Promise<GroupMemberEntity> {
    return this.memberRepo.save(this.memberRepo.create({ groupId, userId }));
  }

  async getMembers(groupId: string): Promise<GroupMemberEntity[]> {
    return this.memberRepo.find({ where: { groupId } });
  }

  async getGroupStats(groupId: string) {
    const qr = this.dataSource;
    const memberCount = await this.memberRepo.count({ where: { groupId } });

    const profileStats = await qr.query(`
      SELECT
        COUNT(*) as "memberCount",
        AVG((mi.cognitive_profile->>'stress_index')::float) as "avgStress",
        AVG((mi.cognitive_profile->>'leadership_score')::float) as "avgLeadership",
        AVG((mi.cognitive_profile->>'punctuality_score')::float) as "avgPunctuality"
      FROM group_members gm
      JOIN master_identities mi ON mi.id::text = gm.user_id::text
      WHERE gm.group_id::text = $1::text
    `, [groupId]);

    const engagementStats = await qr.query(`
      SELECT ce.action, COUNT(*) as cnt
      FROM content_engagements ce
      JOIN group_members gm ON gm.user_id = ce.user_id
      WHERE gm.group_id = $1
      GROUP BY ce.action
    `, [groupId]);

    const stats = profileStats[0] || {};
    return {
      memberCount,
      avgStress: parseFloat(stats.avgStress) || 0,
      avgLeadership: parseFloat(stats.avgLeadership) || 0,
      avgPunctuality: parseFloat(stats.avgPunctuality) || 0,
      engagementBreakdown: engagementStats.reduce((acc: any, row: any) => {
        acc[row.action] = parseInt(row.cnt);
        return acc;
      }, {}),
    };
  }

  async getGroupMembersDetailed(groupId: string) {
    return this.dataSource.query(`
      SELECT
        mi.id, mi.email, mi.role, mi.status,
        mi.cognitive_profile as "cognitiveProfile",
        mi.computed_tags as "computedTags",
        mi.last_login_at as "lastLoginAt",
        gm.joined_at as "joinedAt"
      FROM group_members gm
      JOIN master_identities mi ON mi.id::text = gm.user_id::text
      WHERE gm.group_id::text = $1::text
      ORDER BY gm.joined_at ASC
    `, [groupId]);
  }

  async getMentorsByGroupDetailed(groupId: string) {
    const mentors = await this.dataSource.query(`
      SELECT 
        gm.mentor_id as "mentorId",
        gm.group_id as "groupId",
        gm.is_primary as "isPrimary",
        mi.cognitive_profile as "mentorProfile"
      FROM group_mentors gm
      LEFT JOIN master_identities mi ON mi.id::text = gm.mentor_id::text
      WHERE gm.group_id::text = $1::text
      ORDER BY gm.is_primary DESC, gm.assigned_at ASC
    `, [groupId]);
    return mentors;
  }

  async addMentorToGroup(groupId: string, mentorId: string, isPrimary: boolean = false) {
    // Verify mentor exists and is a mentor role
    const mentor = await this.dataSource.query(
      'SELECT id, role FROM master_identities WHERE id::text = $1::text AND role IN ($2, $3)',
      [mentorId, 'mentor', 'teacher']
    );

    // Check if mentor is already in group
    const existing = await this.dataSource.query(
      'SELECT id FROM group_mentors WHERE group_id::text = $1::text AND mentor_id::text = $2::text',
      [groupId, mentorId]
    );

    if (existing.length > 0) {
      throw new Error('Bu mentör zaten grupta.');
    }

    // If isPrimary, set all others to non-primary
    if (isPrimary) {
      await this.dataSource.query(
        'UPDATE group_mentors SET is_primary = false WHERE group_id::text = $1::text',
        [groupId]
      );
    }

    console.log('[GroupsService] Adding mentor to group:', { groupId, mentorId, isPrimary });
    await this.dataSource.query(
      'INSERT INTO group_mentors (group_id, mentor_id, is_primary, assigned_at) VALUES ($1::uuid, $2::uuid, $3, NOW())',
      [groupId, mentorId, isPrimary]
    );

    return { mentorId, groupId, isPrimary };
  }

  async removeMentorFromGroup(groupId: string, mentorId: string): Promise<boolean> {
    console.log('[GroupsService] Removing mentor from group:', { groupId, mentorId });
    const result = await this.dataSource.query(
      'DELETE FROM group_mentors WHERE group_id::text = $1::text AND mentor_id::text = $2::text',
      [groupId, mentorId]
    );
    return result[1] !== 0; // affected rows
  }

  async updatePrimaryMentor(groupId: string, mentorId: string): Promise<boolean> {
    console.log('[GroupsService] Updating primary mentor:', { groupId, mentorId });
    await this.dataSource.query(
      'UPDATE group_mentors SET is_primary = false WHERE group_id::text = $1::text',
      [groupId]
    );

    const result = await this.dataSource.query(
      'UPDATE group_mentors SET is_primary = true WHERE group_id::text = $1::text AND mentor_id::text = $2::text',
      [groupId, mentorId]
    );

    return result[1] !== 0;
  }

  async requestGroupInsight(groupId: string): Promise<string> {
    await this.redisService.pushTaskToQueue('analyze_group', {
      group_id: groupId,
    });
    return `Grup ${groupId} analizi başlatıldı. AI Worker sonucu işleyecek.`;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new Error('Grup bulunamadı.');

    await this.memberRepo.delete({ groupId: id });
    await this.dataSource.query('DELETE FROM event_groups WHERE group_id::text = $1::text', [id]);
    await this.dataSource.query('DELETE FROM group_mentors WHERE group_id::text = $1::text', [id]);

    await this.groupRepo.remove(group);
    return true;
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    await this.memberRepo.delete({ groupId, userId });
    return true;
  }

  async getEventsByGroup(groupId: string) {
    return this.dataSource.query(`
      SELECT 
        e.id, e.title, e.description, 
        e.event_type as "eventType", 
        e.start_time as "startTime", 
        e.location, 
        e.is_active as "isActive"
      FROM events e
      JOIN event_groups eg ON eg.event_id::text = e.id::text
      WHERE eg.group_id::text = $1::text AND (e.is_active = true OR e.is_active IS NULL)
    `, [groupId]);
  }

  async getMentorsByGroup(groupId: string): Promise<string[]> {
    const res = await this.dataSource.query(`
      SELECT mentor_id FROM group_mentors WHERE group_id::text = $1::text
      ORDER BY is_primary DESC, assigned_at ASC
    `, [groupId]);
    return res.map((r: any) => r.mentor_id);
  }

  async getMemberIdsByGroup(groupId: string): Promise<string[]> {
    const res = await this.dataSource.query(`
      SELECT user_id FROM group_members WHERE group_id::text = $1::text
    `, [groupId]);
    return res.map((r: any) => r.user_id);
  }
}
