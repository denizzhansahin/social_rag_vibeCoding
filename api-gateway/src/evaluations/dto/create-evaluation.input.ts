import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { EvaluationCategory } from '../enums/evaluation-category.enum';
import { EvaluationTargetType } from '../enums/evaluation-target-type.enum';

@InputType()
export class CreateEvaluationInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  evaluatorId: string;

  @Field()
  @IsNotEmpty()
  targetId: string;

  @Field(() => EvaluationTargetType)
  @IsEnum(EvaluationTargetType)
  @IsNotEmpty()
  targetType: EvaluationTargetType;

  @Field(() => EvaluationCategory)
  @IsEnum(EvaluationCategory)
  @IsNotEmpty()
  category: EvaluationCategory;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  rawMentorNote?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(5)
  score1to5?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(100)
  score1to100?: number;
}
