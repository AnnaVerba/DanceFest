import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Competition {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  date: string;

  @Field()
  location: string;

  @Field()
  style: string;
}
