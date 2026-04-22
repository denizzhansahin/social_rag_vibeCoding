import { ObjectType, Field, ID, Int, InputType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { IsString, IsArray, IsUUID, IsInt, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ObjectType()
export class OnboardingQuestion {
  @Field(() => ID)
  id: string;

  @Field()
  questionText: string;

  @Field()
  questionType: string;

  @Field(() => GraphQLJSON)
  options: any;

  @Field(() => Int)
  orderIndex: number;

  @Field()
  isActive: boolean;
}

@ObjectType()
export class OnboardingResponse {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  questionId: string;

  @Field()
  responseData: string;
}

@InputType()
export class OnboardingAnswerInput {
  @Field(() => ID)
  @IsString()
  questionId: string;

  @Field()
  @IsString()
  responseData: string;
}

@InputType()
export class SubmitOnboardingInput {
  @Field(() => ID)
  @IsString()
  userId: string;

  @Field(() => [OnboardingAnswerInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingAnswerInput)
  answers: OnboardingAnswerInput[];
}

@InputType()
export class CreateQuestionInput {
  @Field()
  @IsString()
  questionText: string;

  @Field()
  @IsString()
  questionType: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  options?: any;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  orderIndex: number;
}

@InputType()
export class UpdateQuestionInput {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionType?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  options?: any;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
