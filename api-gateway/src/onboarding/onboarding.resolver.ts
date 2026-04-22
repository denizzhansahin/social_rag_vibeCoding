import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { OnboardingService } from './onboarding.service';
import { OnboardingQuestion, OnboardingResponse, SubmitOnboardingInput, CreateQuestionInput, UpdateQuestionInput } from './onboarding.model';

@Resolver()
export class OnboardingResolver {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Query(() => [OnboardingQuestion], { name: 'getActiveOnboardingQuestions' })
  async getActiveQuestions() {
    return this.onboardingService.getActiveQuestions();
  }

  @Query(() => [OnboardingQuestion], { name: 'getAllOnboardingQuestions' })
  async getAllQuestions() {
    return this.onboardingService.getAllQuestions();
  }

  @Query(() => [OnboardingResponse], { name: 'getUserOnboardingResponses' })
  async getUserResponses(@Args('userId') userId: string) {
    return this.onboardingService.getUserResponses(userId);
  }

  @Query(() => [OnboardingResponse], { name: 'getAllOnboardingResponses' })
  async getAllResponses() {
    return this.onboardingService.getAllResponses();
  }

  @Mutation(() => OnboardingQuestion)
  async createOnboardingQuestion(@Args('input') input: CreateQuestionInput) {
    return this.onboardingService.createQuestion(input);
  }

  @Mutation(() => OnboardingQuestion)
  async updateOnboardingQuestion(@Args('input') input: UpdateQuestionInput) {
    return this.onboardingService.updateQuestion(input);
  }

  @Mutation(() => Boolean)
  async deleteOnboardingQuestion(@Args('id') id: string) {
    return this.onboardingService.deleteQuestion(id);
  }

  @Mutation(() => OnboardingQuestion)
  async toggleOnboardingQuestion(
    @Args('id') id: string,
    @Args('isActive') isActive: boolean,
  ) {
    return this.onboardingService.toggleQuestion(id, isActive);
  }

  @Mutation(() => OnboardingResponse)
  async updateOnboardingResponse(
    @Args('userId') userId: string,
    @Args('questionId') questionId: string,
    @Args('responseData') responseData: string,
  ) {
    return this.onboardingService.updateResponse(userId, questionId, responseData);
  }

  @Mutation(() => Boolean)
  async submitOnboarding(@Args('input') input: SubmitOnboardingInput) {
    return this.onboardingService.submitOnboarding(input);
  }
}
