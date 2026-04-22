import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { EvaluationsService } from './evaluations.service';
import { Evaluation } from './entities/evaluation.entity';
import { CreateEvaluationInput } from './dto/create-evaluation.input';

@Resolver(() => Evaluation)
export class EvaluationsResolver {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Mutation(() => Evaluation, { name: 'createEvaluation' })
  createEvaluation(
    @Args('createEvaluationInput') createEvaluationInput: CreateEvaluationInput,
  ) {
    return this.evaluationsService.create(createEvaluationInput);
  }

  @Query(() => [Evaluation], { name: 'evaluations' })
  findAll() {
    return this.evaluationsService.findAll();
  }

  @Query(() => [Evaluation], { name: 'evaluationsByTarget' })
  findByTarget(@Args('targetId') targetId: string) {
    return this.evaluationsService.findByTarget(targetId);
  }

  @Query(() => Evaluation, { name: 'evaluation', nullable: true })
  findOne(@Args('id') id: string) {
    return this.evaluationsService.findOne(id);
  }
}
