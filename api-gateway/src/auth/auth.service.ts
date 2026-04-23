import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import { LoginInput } from './dto/login.input';
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const adminEmail = 'admin@admin.com';
    try {
      const existingAdmin = await this.userRepo.findOne({ where: { email: adminEmail } });
      
      if (!existingAdmin) {
        console.log(`[AuthService] 🚀 Admin ${adminEmail} not found. Seeding default admin...`);
        await this.createUser(adminEmail, 'admin', { name: 'Sistem Yöneticisi' }, 'admin123');
        console.log(`[AuthService] ✅ Default admin (${adminEmail}) created with password: admin123`);
      } else {
        // Optional: Force reset password for the specific admin@admin.com on every boot to ensure access
        console.log(`[AuthService] 🛡️ Admin ${adminEmail} exists. Ensuring password is 'admin123'...`);
        existingAdmin.passwordHash = await bcrypt.hash('admin123', 10);
        await this.userRepo.save(existingAdmin);
        console.log(`[AuthService] ✅ Admin ${adminEmail} password synchronized.`);
      }
    } catch (err) {
      console.error('[AuthService] ❌ onModuleInit() hatası:', err);
    }
  }

  async login(input: LoginInput) {
    try {
      console.log('[AuthService] 🔑 Giriş denemesi:', input.email);
      const user = await this.userRepo.findOne({ where: { email: input.email } });
      if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı.');
      
      const isMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!isMatch) throw new UnauthorizedException('E-posta veya şifre hatalı.');

      // Update last login
      user.lastLoginAt = new Date();
      await this.userRepo.save(user);

      const payload = { sub: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(payload);
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
      // Fetch group ID for participant/mentor
      let groupId = null;
      try {
        const groupResult = await this.dataSource.query(
          'SELECT group_id FROM group_members WHERE user_id::text = $1::text LIMIT 1',
          [user.id]
        );
        groupId = groupResult[0]?.group_id || null;
      } catch (groupError) {
        console.error('[AuthService] ⚠️ Grup bilgisi çekilemedi (login devam ediyor):', groupError.message);
      }

      const result = {
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          groupId,
          cognitiveProfile: user.cognitiveProfile, 
          hasCompletedOnboarding: user.hasCompletedOnboarding || false, 
          socialLinks: user.socialLinks || {} 
        },
      };
      
      console.log('[AuthService] ✅ Giriş başarılı:', user.email);
      return result;
    } catch (error) {
      console.error('[AuthService] ❌ Login Hatası Detayı:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getUsersByRole(role: string): Promise<UserEntity[]> {
    return this.userRepo.find({ where: { role: role as any }, order: { createdAt: 'DESC' } });
  }

  /**
   * Kullanıcı çevrimiçi durumu hesapla: online / away / offline
   * - online: son 5 dakikada telemetri/engagement kaydı var
   * - away: son 30 dakikada var ama 5 dakikada yok
   * - offline: son 30 dakikada hiç kayıt yok
   */
  async getUsersWithStatus(): Promise<any[]> {
    console.log('[AuthService] Fetching users with status...');
    const results = await this.dataSource.query(`
      SELECT 
        mi.id, mi.email, mi.role, mi.status,
        gm.group_id AS "groupId",
        mi.cognitive_profile AS "cognitiveProfile",
        mi.social_links AS "socialLinks",
        mi.telemetry_summary AS "telemetrySummary",
        mi.performance_metrics AS "performanceMetrics",
        mi.computed_tags AS "computedTags",
        mi.last_login_at AS "lastLoginAt",
        CASE
          WHEN EXISTS (
            SELECT 1 FROM telemetry_streams ts 
            WHERE ts.user_id = mi.id::text AND ts.created_at > NOW() - INTERVAL '5 minutes'
          ) OR EXISTS (
            SELECT 1 FROM content_engagements ce 
            WHERE ce.user_id = mi.id::text AND ce.seen_at > NOW() - INTERVAL '5 minutes'
          ) THEN 'online'
          WHEN EXISTS (
            SELECT 1 FROM telemetry_streams ts 
            WHERE ts.user_id = mi.id::text AND ts.created_at > NOW() - INTERVAL '30 minutes'
          ) OR EXISTS (
            SELECT 1 FROM content_engagements ce 
            WHERE ce.user_id = mi.id::text AND ce.seen_at > NOW() - INTERVAL '30 minutes'
          ) THEN 'away'
          ELSE 'offline'
        END as "presenceStatus"
      FROM master_identities mi
      LEFT JOIN LATERAL (
        SELECT group_id
        FROM group_members
        WHERE user_id::text = mi.id::text
        ORDER BY joined_at ASC
        LIMIT 1
      ) gm ON true
      WHERE mi.status = 'active' OR mi.status IS NULL
      ORDER BY mi.last_login_at DESC NULLS LAST
    `);
    console.log(`[AuthService] DB returned ${results?.length || 0} users.`);
    if (results && results.length > 0) {
      console.log('[AuthService] First Result Keys:', Object.keys(results[0]).join(', '));
    }
    return results || [];
  }

  /**
   * Durum filtrelemesi: sadece online, away veya offline kullanıcılar
   */
  async getUsersByStatus(presenceFilter: string): Promise<any[]> {
    const all = await this.getUsersWithStatus();
    return all.filter(u => u.presenceStatus === presenceFilter);
  }

  /**
   * Mini profil: Ağ haritasında bir node tıklandığında gösterilecek özet
   */
  async getMiniProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    // Son engagement
    const lastEngagement = await this.dataSource.query(`
      SELECT action, seen_at FROM content_engagements 
      WHERE user_id::text = $1::text ORDER BY seen_at DESC LIMIT 1
    `, [userId]);

    // Son yoklama
    const lastAttendance = await this.dataSource.query(`
      SELECT physical_zone, punctuality, scan_time FROM spatial_temporal_logs
      WHERE user_id::text = $1::text ORDER BY scan_time DESC LIMIT 1
    `, [userId]);

    // Grup üyelikleri
    const groups = await this.dataSource.query(`
      SELECT g.name FROM groups g 
      JOIN group_members gm ON gm.group_id::text = g.id::text 
      WHERE gm.user_id::text = $1::text
    `, [userId]);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      cognitiveProfile: user.cognitiveProfile,
      computedTags: user.computedTags,
      traits: user.cognitiveProfile?.detected_traits || [],
      stressIndex: user.cognitiveProfile?.stress_index || 0,
      engagementStyle: user.cognitiveProfile?.engagement_style || 'unknown',
      lastAction: lastEngagement[0] || null,
      lastLocation: lastAttendance[0] || null,
      groups: groups.map((g: any) => g.name),
    };
  }

  /**
   * Tam Kapsamlı Kullanıcı Profili
   */
  async getDetailedUserProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const qr = this.dataSource;

    // Groups
    const groups = await qr.query(`
      SELECT g.id, g.name FROM groups g 
      JOIN group_members gm ON gm.group_id::text = g.id::text 
      WHERE gm.user_id::text = $1::text
    `, [userId]);

    // recent attendances (last 10)
    const recentAttendances = await qr.query(`
      SELECT e.title as event_title, stl.punctuality, stl.scan_time, stl.delay_minutes
      FROM spatial_temporal_logs stl
      LEFT JOIN events e ON e.id::text = stl.session_id::text
      WHERE stl.user_id::text = $1::text
      ORDER BY stl.scan_time DESC LIMIT 10
    `, [userId]);

    // recent engagements (last 10)
    const recentEngagements = await qr.query(`
      SELECT so.object_type, ce.action, ce.interacted_at, ce.response_data
      FROM content_engagements ce
      JOIN social_objects so ON so.id = ce.object_id
      WHERE ce.user_id = $1
      ORDER BY ce.interacted_at DESC NULLS LAST LIMIT 10
    `, [userId]);

    // mentor evaluations
    const mentorEvaluations = await qr.query(`
      SELECT 
        mi.email as evaluator_email, 
        eval.category, 
        eval.score_1_to_5, 
        eval.score_1_to_100, 
        eval.ai_extracted_insights,
        eval.created_at
      FROM evaluations eval
      JOIN master_identities mi ON mi.id = eval.evaluator_id
      WHERE eval.target_id = $1
      ORDER BY eval.created_at DESC
    `, [userId]);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      cognitive_profile: user.cognitiveProfile,
      computed_tags: user.computedTags,
      telemetry_summary: user.telemetrySummary,
      performance_metrics: user.performanceMetrics,
      last_login_at: user.lastLoginAt,
      groups: groups, // Return full objects {id, name}
      recentAttendances,
      recentEngagements,
      mentorEvaluations: mentorEvaluations.filter((e: any) => e.category !== 'survey'),
      surveys: mentorEvaluations.filter((e: any) => e.category === 'survey'),
      attendedEvents: await qr.query(`
        SELECT e.id, e.title, e.event_type, e.start_time
        FROM events e
        LEFT JOIN event_assignments ea ON ea.event_id::text = e.id::text
        LEFT JOIN event_groups eg ON eg.event_id::text = e.id::text
        LEFT JOIN group_members gm ON gm.group_id::text = eg.group_id::text
        WHERE ea.user_id::text = $1::text OR gm.user_id::text = $1::text
        GROUP BY e.id
        ORDER BY e.start_time DESC
      `, [userId]),
      socialMedia: user.socialLinks || {},
    };
  }

  async createUser(email: string, role: string, cognitiveProfile?: any, password?: string) {
    const passwordHash = await bcrypt.hash(password || 'vizyon_1234', 10);
    const newUser = this.userRepo.create({
      email,
      passwordHash,
      role: role as any,
      status: 'active' as any,
      cognitiveProfile: cognitiveProfile || {},
    });
    return this.userRepo.save(newUser);
  }

  async updateUser(userId: string, updates: any) {
    console.log('[AuthService] Update user request for:', userId, 'Updates:', JSON.stringify(updates));
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    if (updates.email) user.email = updates.email;
    if (updates.role) user.role = updates.role;
    if (updates.password && updates.password.trim() !== '') {
      console.log('[AuthService] Hashing new password for user:', userId);
      user.passwordHash = await bcrypt.hash(updates.password, 10);
    } else if (updates.password === '') {
      console.log('[AuthService] Password field is empty string, skipping update.');
    }
    
    if (updates.status) user.status = updates.status;
    if (updates.cognitiveProfile) {
      user.cognitiveProfile = { ...user.cognitiveProfile, ...updates.cognitiveProfile };
    }
    if (updates.socialLinks) {
      user.socialLinks = { ...user.socialLinks, ...updates.socialLinks };
    }
    if (updates.hasCompletedOnboarding !== undefined) {
      user.hasCompletedOnboarding = updates.hasCompletedOnboarding;
    }

    console.log('[AuthService] Saving updated user profile for:', user.email);
    return this.userRepo.save(user);
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    user.status = 'inactive' as any; // Soft delete
    return this.userRepo.save(user);
  }
}


// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.