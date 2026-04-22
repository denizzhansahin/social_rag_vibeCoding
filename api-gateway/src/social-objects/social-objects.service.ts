import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialObjectEntity } from './social-objects.entity';
import { CreateSocialObjectInput } from './social-objects.model';
import { v4 as uuidv4 } from 'uuid'; // UUID generation

@Injectable()
export class SocialObjectsService {
  constructor(
    @InjectRepository(SocialObjectEntity)
    private readonly socialObjRepo: Repository<SocialObjectEntity>,
  ) {}

  async createObject(input: CreateSocialObjectInput): Promise<SocialObjectEntity> {
    const newObj = this.socialObjRepo.create({
      id: uuidv4(),
      createdBy: input.createdBy,
      objectType: input.objectType,
      uiPayload: input.uiPayload,
      targetRules: input.targetRules,
    });
    return await this.socialObjRepo.save(newObj);
  }

  // Akıştaki son 50 aktif gönderiyi getirir
  async getFeed(): Promise<SocialObjectEntity[]> {
    return await this.socialObjRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
