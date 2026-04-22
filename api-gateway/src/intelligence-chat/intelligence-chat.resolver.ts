import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { IntelligenceChatService } from './intelligence-chat.service';
import { AgentChatLog } from './entities/chat-log.entity';
import { AskPalantirInput } from './dto/create-chat.input';

@Resolver(() => AgentChatLog)
export class IntelligenceChatResolver {
  constructor(private readonly service: IntelligenceChatService) {}

  @Mutation(() => AgentChatLog)
  askPalantirAgent(@Args('input') input: AskPalantirInput) {
    return this.service.askPalantir(input);
  }

  @Query(() => [AgentChatLog], { name: 'adminChatLogs' })
  getLogs(@Args('adminId') adminId: string) {
    return this.service.getRecentChats(adminId);
  }

  @Query(() => AgentChatLog, { name: 'getChatLog', nullable: true })
  getChatLog(@Args('id') id: string) {
    return this.service.getChatLog(id);
  }
}
