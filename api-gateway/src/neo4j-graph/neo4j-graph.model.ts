import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class GraphNode {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  label?: string; // Node Label (Participant vs)

  @Field({ nullable: true })
  type?: string; // Lowercase label for filtering (user, group, etc.)
}

@ObjectType()
export class GraphLink {
  @Field()
  source: string; // React-Force-Graph, bunu arayacak. Node Id'si.

  @Field()
  target: string; // Hedef Node Id'si

  @Field({ nullable: true })
  label?: string; // 'SAT_NEXT_TO', 'CONFLICT_RISK_WITH'
}

@ObjectType()
export class NetworkGraph {
  @Field(() => [GraphNode])
  nodes: GraphNode[];

  @Field(() => [GraphLink])
  links: GraphLink[];
}
