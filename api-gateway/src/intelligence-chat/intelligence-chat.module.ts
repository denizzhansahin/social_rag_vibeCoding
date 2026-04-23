import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntelligenceChatService } from './intelligence-chat.service';
import { IntelligenceChatResolver } from './intelligence-chat.resolver';
import { AgentChatLog } from './entities/chat-log.entity';
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
@Module({
  imports: [TypeOrmModule.forFeature([AgentChatLog])],
  providers: [IntelligenceChatResolver, IntelligenceChatService],
})
export class IntelligenceChatModule {}
