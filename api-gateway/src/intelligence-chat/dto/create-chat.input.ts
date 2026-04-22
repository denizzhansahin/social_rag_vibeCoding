import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

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
