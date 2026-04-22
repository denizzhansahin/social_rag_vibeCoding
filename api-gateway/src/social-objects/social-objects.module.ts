import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialObjectEntity } from './social-objects.entity';
import { SocialObjectsService } from './social-objects.service';
import { SocialObjectsResolver } from './social-objects.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([SocialObjectEntity])],
  providers: [SocialObjectsService, SocialObjectsResolver],
  exports: [SocialObjectsService],
})
export class SocialObjectsModule {}
