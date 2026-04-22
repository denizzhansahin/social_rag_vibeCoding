import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { TelemetryStreamsModule } from './telemetry-streams/telemetry-streams.module';
import { ContentEngagementsModule } from './content-engagements/content-engagements.module';
import { SpatialTemporalLogsModule } from './spatial-temporal-logs/spatial-temporal-logs.module';
import { IntelligenceChatModule } from './intelligence-chat/intelligence-chat.module';
import { RedisModule } from './common/redis/redis.module';
import { Neo4jGraphModule } from './neo4j-graph/neo4j-graph.module';
import { SocialObjectsModule } from './social-objects/social-objects.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { GroupsModule } from './groups/groups.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { FeedPostsModule } from './feed-posts/feed-posts.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    // ... imports same as before ...
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: 'graphql', // Prefix 'api' ile birleşince /api/graphql olacak
      useGlobalPrefix: true, 
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('PG_HOST', 'localhost'),
        port: configService.get<number>('PG_PORT', 5432),
        username: configService.get<string>('PG_USER', 'ai_user'),
        password: configService.get<string>('PG_PASSWORD', 'ai_password_123'),
        database: configService.get<string>('PG_DB', 'cognitive_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        extra: {
          max: 30,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
    EvaluationsModule,
    TelemetryStreamsModule,
    ContentEngagementsModule,
    SpatialTemporalLogsModule,
    IntelligenceChatModule,
    RedisModule,
    Neo4jGraphModule,
    SocialObjectsModule,
    AuthModule,
    EventsModule,
    GroupsModule,
    OnboardingModule,
    FeedPostsModule,
    MediaModule,
  ],
})
export class AppModule { }

