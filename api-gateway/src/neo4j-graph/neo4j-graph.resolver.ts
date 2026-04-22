import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Neo4jGraphService } from './neo4j-graph.service';
import { NetworkGraph, GraphNode, GraphLink } from './neo4j-graph.model';
import { MatchingResult } from './matching-result.entity';

@Resolver(() => NetworkGraph)
export class Neo4jGraphResolver {
  constructor(private readonly neo4jService: Neo4jGraphService) {}

  @Query(() => NetworkGraph, { name: 'getNetworkGraph' })
  async getNetworkGraph() {
    return this.neo4jService.getNetworkGraph();
  }

  @Query(() => [GraphNode], { name: 'getIsolatedUsers' })
  async getIsolatedUsers() {
    return this.neo4jService.getIsolatedUsers();
  }

  @Query(() => [GraphLink], { name: 'getConflictPairs' })
  async getConflictPairs() {
    return this.neo4jService.getConflictPairs();
  }

  @Query(() => [GraphNode], { name: 'getBridgeNodes' })
  async getBridgeNodes() {
    return this.neo4jService.getBridgeNodes();
  }

  @Query(() => [GraphNode], { name: 'getInfluencers' })
  async getInfluencers() {
    return this.neo4jService.getInfluencers();
  }

  @Query(() => [GraphLink], { name: 'getPotentialMatches' })
  async getPotentialMatches() {
    return this.neo4jService.getPotentialMatches();
  }

  @Query(() => [MatchingResult], { name: 'getPersistentMatches' })
  async getPersistentMatches() {
    const results = await this.neo4jService.getPersistentMatches();
    return results.map(r => ({
      ...r,
      similarityScore: typeof r.similarityScore === 'string' ? parseFloat(r.similarityScore) : r.similarityScore
    }));
  }

  @Query(() => [MatchingResult], { name: 'getMyMatches' })
  async getMyMatches(@Args('userId') userId: string) {
    const results = await this.neo4jService.getMyMatches(userId);
    return results.map(r => ({
      ...r,
      similarityScore: typeof r.similarityScore === 'string' ? parseFloat(r.similarityScore) : r.similarityScore
    }));
  }

  @Query(() => [MatchingResult], { name: 'getDiscoveryRecommendations' })
  async getDiscoveryRecommendations(@Args('userId') userId: string) {
    const results = await this.neo4jService.getDiscoveryRecommendations(userId);
    // Map scores to "similarityScore" to match the entity
    return results.map(r => ({
      ...r,
      similarityScore: parseFloat(r.similarity_score)
    }));
  }

  @Query(() => NetworkGraph, { name: 'getParticipantConnections' })
  async getParticipantConnections(@Args('userName') userName: string) {
    return this.neo4jService.getParticipantConnections(userName);
  }

  @Query(() => NetworkGraph, { name: 'getGroupNetworkGraph' })
  async getGroupNetworkGraph(@Args('groupId') groupId: string) {
    return this.neo4jService.getGroupNetworkGraph(groupId);
  }

  @Mutation(() => String, { name: 'triggerFullSync' })
  async triggerFullSync() {
    return this.neo4jService.triggerFullSync();
  }

  @Mutation(() => String, { name: 'fixDatabaseConstraint' })
  async fixDatabaseConstraint() {
    return this.neo4jService.fixDatabaseConstraint();
  }

  @Query(() => NetworkGraph, { name: 'getFilteredGraph' })
  async getFilteredGraph(
    @Args('id') id: string,
    @Args('type', { nullable: true }) type: string
  ) {
    return this.neo4jService.getFilteredGraph(id, type);
  }
}
