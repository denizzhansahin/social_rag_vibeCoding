import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEntity } from './event.entity';
import { EventAssignmentEntity } from './event-assignment.entity';
import { EventGroupEntity } from './event-group.entity';
import { CreateEventInput } from './event.model';
import { FeedPostEntity } from '../feed-posts/feed-post.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity) private readonly repo: Repository<EventEntity>,
    @InjectRepository(EventAssignmentEntity) private readonly assignmentRepo: Repository<EventAssignmentEntity>,
    @InjectRepository(EventGroupEntity) private readonly eventGroupRepo: Repository<EventGroupEntity>,
    @InjectRepository(FeedPostEntity) private readonly feedPostRepo: Repository<FeedPostEntity>,
    private readonly dataSource: DataSource,
  ) { }

  async create(input: CreateEventInput): Promise<EventEntity> {
    const event = this.repo.create(input);
    const savedEvent = await this.repo.save(event);

    if (input.groupId) {
      await this.assignGroupToEvent(savedEvent.id, input.groupId);
    }

    // AUTOMATIC SYSTEM POST: When event is created, create a system post
    try {
      const systemId = '00000000-0000-0000-0000-000000000000';
      const systemPost = this.feedPostRepo.create({
        authorId: (input.createdBy && input.createdBy.length > 5) ? input.createdBy : systemId,
        contentText: `📅 Yeni Etkinlik: ${savedEvent.title}\n\n${savedEvent.description || 'Detaylar yakında!'}`,
        scope: 'global',
        postType: 'announcement',
        isSystem: true,
        isPinned: true,
        reactions: {},
        metadata: {
          eventId: savedEvent.id,
          eventType: savedEvent.eventType,
          eventTime: savedEvent.startTime,
        },
      });
      await this.feedPostRepo.save(systemPost);
    } catch (error) {
      console.error('Failed to create system post for event:', error);
      // Don't fail event creation if system post fails
    }

    return savedEvent;
  }

  async update(id: string, updates: any): Promise<EventEntity> {
    const event = await this.repo.findOne({ where: { id } });
    if (!event) throw new Error('Etkinlik bulunamadı.');

    Object.assign(event, updates);
    return this.repo.save(event);
  }

  async assignToEvent(eventId: string, userId: string, role: string, notes?: string): Promise<EventAssignmentEntity> {
    const existing = await this.assignmentRepo.findOne({ where: { eventId, userId, role } });
    if (existing) return existing;
    const assignment = this.assignmentRepo.create({ eventId, userId, role, notes });
    return this.assignmentRepo.save(assignment);
  }

  async assignGroupToEvent(eventId: string, groupId: string): Promise<EventGroupEntity> {
    // Robust presence check using raw query to avoid type mismatch issues
    const existing = await this.dataSource.query(`
      SELECT id FROM event_groups 
      WHERE event_id::text = $1::text AND group_id::text = $2::text
      LIMIT 1
    `, [eventId, groupId]);

    if (existing && existing.length > 0) {
      const found = await this.eventGroupRepo.findOne({ where: { id: existing[0].id } });
      if (!found) throw new Error('Event group record found in raw query but missing in repository');
      return found;
    }

    const eventGroup = this.eventGroupRepo.create({
      eventId: eventId as any,
      groupId: groupId as any
    });
    return this.eventGroupRepo.save(eventGroup);
  }

  async findAll(): Promise<EventEntity[]> {
    console.log('[EventsService] Fetching all events...');
    const events = await this.repo.find({ 
      order: { startTime: 'ASC' }, 
      where: [
        { isActive: true },
        { isActive: (null as any) } // Allow NULL values
      ]
    });
    console.log(`[EventsService] Found ${events.length} events.`);
    return events;
  }

  async findById(id: string): Promise<EventEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['assignments', 'eventGroups'] });
  }

  async getAssignments(eventId: string): Promise<EventAssignmentEntity[]> {
    return this.assignmentRepo.find({ where: { eventId } });
  }

  /**
   * Etkinlik detay görünümü: katılım, feedback skorları, duygu analizi
   */
  async getEventDetail(eventId: string) {
    // Yoklama istatistikleri
    const attendance = await this.dataSource.query(`
      SELECT punctuality, COUNT(*) as cnt
      FROM spatial_temporal_logs
      WHERE session_id = $1
      GROUP BY punctuality
    `, [eventId]);

    // Engagement'ler (beğeni, yorum, cevaplama)
    const engagements = await this.dataSource.query(`
      SELECT ce.action, COUNT(*) as cnt
      FROM content_engagements ce
      JOIN social_objects so ON so.id::text = ce.object_id::text
      WHERE so.trigger_event::text = $1::text
      GROUP BY ce.action
    `, [eventId]);

    // Ortalama slider/feedback puanları
    const feedbackScores = await this.dataSource.query(`
      SELECT 
        AVG((ce.response_data->>'slider_value')::float) as avg_score,
        COUNT(*) as response_count
      FROM content_engagements ce
      JOIN social_objects so ON so.id::text = ce.object_id::text
      WHERE so.trigger_event::text = $1::text AND ce.action = 'answered'
    `, [eventId]);

    // Mentor değerlendirme ortalaması
    const mentorEvals = await this.dataSource.query(`
      SELECT 
        AVG(score_1_to_5) as avg_mentor_score,
        COUNT(*) as eval_count
      FROM evaluations
      WHERE (ai_extracted_insights->>'session_id')::text = $1::text
    `, [eventId]);

    // Get assigned users details
    const assignments = await this.assignmentRepo.find({ where: { eventId } });

    // Get assigned groups
    const assignedGroups = await this.getGroupsByEvent(eventId);

    return {
      attendance: attendance.reduce((acc: any, r: any) => { acc[r.punctuality] = parseInt(r.cnt); return acc; }, {}),
      engagements: engagements.reduce((acc: any, r: any) => { acc[r.action] = parseInt(r.cnt); return acc; }, {}),
      avgFeedbackScore: parseFloat(feedbackScores[0]?.avg_score) || null,
      feedbackCount: parseInt(feedbackScores[0]?.response_count) || 0,
      avgMentorScore: parseFloat(mentorEvals[0]?.avg_mentor_score) || null,
      mentorEvalCount: parseInt(mentorEvals[0]?.eval_count) || 0,
      assignedGroups,
      assignments,
    };
  }

  /**
   * Tüm etkinliklerin zaman bazlı katılım trendi
   */
  async getAttendanceTrend() {
    return this.dataSource.query(`
      SELECT 
        e.id as "eventId",
        e.title,
        e.event_type as "eventType",
        e.start_time as "startTime",
        COUNT(stl.id) as "totalAttendance",
        COUNT(CASE WHEN stl.punctuality IN ('on_time', 'early') THEN 1 END) as "onTimeCount",
        COUNT(CASE WHEN stl.punctuality = 'late' THEN 1 END) as "lateCount"
      FROM events e
      LEFT JOIN spatial_temporal_logs stl ON stl.session_id::text = e.id::text
      WHERE e.is_active = true
      GROUP BY e.id, e.title, e.event_type, e.start_time
      ORDER BY e.start_time ASC
    `);
  }

  /**
   * Etkinlik tipi bazlı ortalama katılım
   */
  async getAttendanceByType() {
    return this.dataSource.query(`
      SELECT 
        e.event_type as "eventType",
        COUNT(DISTINCT e.id) as "eventCount",
        AVG(sub.attendance_count) as "avgAttendance"
      FROM events e
      LEFT JOIN (
        SELECT session_id, COUNT(*) as attendance_count
        FROM spatial_temporal_logs
        GROUP BY session_id
      ) sub ON sub.session_id::text = e.id::text
      WHERE e.is_active = true
      GROUP BY e.event_type
      ORDER BY "avgAttendance" DESC
    `);
  }

  async deleteEvent(id: string): Promise<boolean> {
    const event = await this.repo.findOne({ where: { id } });
    if (!event) throw new Error('Etkinlik bulunamadı.');

    // Cleanup assignments
    await this.assignmentRepo.delete({ eventId: id });
    await this.eventGroupRepo.delete({ eventId: id });

    // Soft delete by setting isActive = false
    event.isActive = false;
    await this.repo.save(event);
    return true;
  }

  async unassignGroup(eventId: string, groupId: string): Promise<boolean> {
    await this.eventGroupRepo.delete({ eventId, groupId });
    return true;
  }

  async unassignUser(eventId: string, userId: string): Promise<boolean> {
    await this.assignmentRepo.delete({ eventId, userId });
    return true;
  }

  async getGroupsByEvent(eventId: string) {
    return this.dataSource.query(`
      SELECT g.id, g.name, g.mentor_id AS "mentorId", g.metadata, g.created_at AS "createdAt"
      FROM groups g
      JOIN event_groups eg ON eg.group_id::text = g.id::text
      WHERE eg.event_id::text = $1::text
    `, [eventId]);
  }

  async getEventsForUser(userId: string): Promise<EventEntity[]> {
    return this.dataSource
      .createQueryBuilder(EventEntity, 'e')
      .leftJoin('e.assignments', 'ea')
      .leftJoin('e.eventGroups', 'eg')
      .leftJoin('group_members', 'gm', 'gm.group_id = eg.group_id')
      .where('(ea.user_id = :userId OR gm.user_id = :userId)', { userId })
      .andWhere('(e.is_active = true OR e.is_active IS NULL)')
      .orderBy('e.start_time', 'ASC')
      .getMany();
  }
}


