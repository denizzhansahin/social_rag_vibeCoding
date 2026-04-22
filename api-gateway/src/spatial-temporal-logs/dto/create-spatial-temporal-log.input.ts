import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { PunctualityStatus } from '../enums/punctuality-status.enum';

@InputType()
export class CreateSpatialTemporalLogInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  terminalId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  physicalZone: string;

  @Field()
  @IsNotEmpty()
  scanTime: Date;

  @Field({ nullable: true })
  @IsOptional()
  expectedTime?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  delayMinutes?: number;

  @Field(() => PunctualityStatus)
  @IsEnum(PunctualityStatus)
  @IsNotEmpty()
  punctuality: PunctualityStatus;

  @Field(() => String, { nullable: true, description: 'JSON string of spatial context (e.g. concurrent scans)' })
  @IsOptional()
  spatialContext?: string;
}
