import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPayload, AuthUser } from './auth.model';
import { LoginInput } from './dto/login.input';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import { ObjectType, Field, Float } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class UserWithStatus {
  @Field() id: string;
  @Field() email: string;
  @Field() role: string;
  @Field({ nullable: true }) status: string;
  @Field({ nullable: true }) groupId: string;
  @Field(() => GraphQLJSON, { nullable: true }) cognitiveProfile: any;
  @Field(() => GraphQLJSON, { nullable: true }) socialLinks: any;
  @Field(() => GraphQLJSON, { nullable: true }) telemetrySummary: any;
  @Field(() => GraphQLJSON, { nullable: true }) performanceMetrics: any;
  @Field(() => GraphQLJSON, { nullable: true }) computedTags: any;
  @Field({ nullable: true }) lastLoginAt: Date;
  @Field() presenceStatus: string;  // online | away | offline
}

@ObjectType()
export class MiniProfile {
  @Field() id: string;
  @Field() email: string;
  @Field() role: string;
  @Field(() => GraphQLJSON, { nullable: true }) cognitiveProfile: any;
  @Field(() => GraphQLJSON, { nullable: true }) computedTags: any;
  @Field(() => [String]) traits: string[];
  @Field(() => Number) stressIndex: number;
  @Field() engagementStyle: string;
  @Field(() => GraphQLJSON, { nullable: true }) lastAction: any;
  @Field(() => GraphQLJSON, { nullable: true }) lastLocation: any;
  @Field(() => [String]) groups: string[];
}

@ObjectType()
export class DetailedUserProfile {
  @Field() id: string;
  @Field() email: string;
  @Field() role: string;
  @Field({ nullable: true }) status: string;
  @Field(() => GraphQLJSON, { nullable: true }) cognitiveProfile: any;
  @Field(() => GraphQLJSON, { nullable: true }) computedTags: any;
  @Field({ nullable: true }) lastLoginAt: Date;
  @Field(() => GraphQLJSON, { nullable: true }) groups: any;
  @Field(() => GraphQLJSON, { nullable: true }) telemetrySummary: any;
  @Field(() => GraphQLJSON, { nullable: true }) performanceMetrics: any;
  @Field(() => GraphQLJSON, { nullable: true }) recentAttendances: any;
  @Field(() => GraphQLJSON, { nullable: true }) recentEngagements: any;
  @Field(() => GraphQLJSON, { nullable: true }) mentorEvaluations: any;
  @Field(() => GraphQLJSON, { nullable: true }) attendedEvents: any;
  @Field(() => GraphQLJSON, { nullable: true }) surveys: any;
  @Field(() => GraphQLJSON, { nullable: true }) socialMedia: any;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  private mapStats(user: any) {
    return {
      ...user,
      telemetrySummary: user.telemetrySummary,
      performanceMetrics: user.performanceMetrics,
      cognitiveProfile: user.cognitiveProfile,
      computedTags: user.computedTags,
      lastLoginAt: user.lastLoginAt,
    };
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    const result = await this.authService.login(input);
    return {
      token: result.token,
      user: this.mapStats(result.user),
    };
  }

  @Query(() => [AuthUser], { name: 'getAllUsers' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('admin')
  async getAllUsers(): Promise<AuthUser[]> {
    const users = await this.authService.getAllUsers();
    return users.map(u => this.mapStats(u));
  }

  /** Tüm kullanıcıler durum bilgisiyle (online/away/offline) */
  @Query(() => [UserWithStatus], { name: 'getUsersWithStatus' })
  async getUsersWithStatus() {
    console.log('[AuthResolver] getUsersWithStatus called');
    const users = await this.authService.getUsersWithStatus();
    console.log(`[AuthResolver] Returning ${users.length} users to GQL client.`);
    return users.map(u => ({
      ...u,
      // The service already provides presenceStatus, cognitiveProfile, etc. due to AS renaming in SQL
    }));
  }

  /** Durum filtresi: sadece 'online', 'away' veya 'offline' kullanıcılar */
  @Query(() => [UserWithStatus], { name: 'getUsersByStatus' })
  async getUsersByStatus(@Args('status') status: string) {
    const users = await this.authService.getUsersByStatus(status);
    return users.map(u => ({
      ...u,
      presenceStatus: u.presence_status,
      xp: u.performanceMetrics?.xp || 0,
      cognitiveProfile: u.cognitive_profile,
      computedTags: u.computed_tags,
      lastLoginAt: u.last_login_at
    }));
  }

  /** Tek kullanıcının detaylı profili */
  @Query(() => AuthUser, { name: 'getParticipantProfile', nullable: true })
  async getParticipantProfile(@Args('userId') userId: string): Promise<AuthUser | null> {
    const user = await this.authService.findById(userId);
    if (!user) return null;
    return this.mapStats(user);
  }

  /** Tek kullanıcının HER ŞEYİ (Full Profile) */
  @Query(() => DetailedUserProfile, { name: 'getDetailedUserProfile', nullable: true })
  async getDetailedUserProfile(@Args('userId') userId: string) {
    const data = await this.authService.getDetailedUserProfile(userId);
    if (!data) return null;
    return {
      ...data,
      cognitiveProfile: data.cognitive_profile,
      computedTags: data.computed_tags,
      lastLoginAt: data.last_login_at,
      telemetrySummary: data.telemetry_summary,
      performanceMetrics: data.performance_metrics,
    };
  }

  /** Mini profil: Ağ haritasında node tıklandığında */
  @Query(() => MiniProfile, { name: 'getMiniProfile', nullable: true })
  async getMiniProfile(@Args('userId') userId: string) {
    return this.authService.getMiniProfile(userId);
  }

  // --- MÜDAHALE & YÖNETİM (ADMIN ONLY) ---

  @Mutation(() => AuthUser)
  async createUser(
    @Args('email') email: string,
    @Args('role') role: string,
    @Args('password', { nullable: true }) password?: string,
    @Args('cognitiveProfile', { type: () => GraphQLJSON, nullable: true }) cognitiveProfile?: any,
  ) {
    const user: any = await this.authService.createUser(email, role, cognitiveProfile, password);
    return this.mapStats(user);
  }

  @Mutation(() => AuthUser)
  async updateUser(
    @Args('userId') userId: string,
    @Args('updates', { type: () => GraphQLJSON }) updates: any,
  ) {
    console.log('[AuthResolver] updateUser called', { userId, updates });
    const user: any = await this.authService.updateUser(userId, updates);
    return this.mapStats(user);
  }

  @Mutation(() => AuthUser)
  async deleteUser(@Args('userId') userId: string) {
    const user: any = await this.authService.deleteUser(userId);
    return this.mapStats(user);
  }
}
