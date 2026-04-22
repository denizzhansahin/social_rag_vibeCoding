import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntelligenceChatService } from './intelligence-chat.service';
import { IntelligenceChatResolver } from './intelligence-chat.resolver';
import { AgentChatLog } from './entities/chat-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentChatLog])],
  providers: [IntelligenceChatResolver, IntelligenceChatService],
})
export class IntelligenceChatModule {}
