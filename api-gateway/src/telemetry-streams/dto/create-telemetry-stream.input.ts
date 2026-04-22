import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { TelemetryEventType } from '../enums/event-type.enum';

@InputType()
export class CreateTelemetryStreamInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field(() => TelemetryEventType)
  @IsEnum(TelemetryEventType)
  @IsNotEmpty()
  eventType: TelemetryEventType;

  @Field()
  @IsString()
  @IsNotEmpty()
  targetPath: string;

  @Field(() => String, { nullable: true, description: "JSON string of metrics payload" })
  @IsOptional()
  metrics?: string;
}
