import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
@InputType()
export class AskPalantirInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  adminId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  query: string;
}
