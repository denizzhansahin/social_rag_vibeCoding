import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { InteractionNature, ActionType } from '../enums/engagement.enum';

@InputType()
export class CreateContentEngagementInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field()
  @IsUUID()
  @IsNotEmpty()
  objectId: string;

  @Field(() => InteractionNature)
  @IsEnum(InteractionNature)
  @IsNotEmpty()
  nature: InteractionNature;

  @Field(() => ActionType)
  @IsEnum(ActionType)
  @IsNotEmpty()
  action: ActionType;

  @Field(() => String, { nullable: true, description: "JSON string of response payload" })
  @IsOptional()
  responseData?: string;

  @Field(() => String, { nullable: true, description: "JSON string of behavioral metrics" })
  @IsOptional()
  behavioralMetrics?: string;

  @Field()
  @IsNotEmpty()
  seenAt: Date;

  @Field({ nullable: true })
  @IsOptional()
  interactedAt?: Date;
}
