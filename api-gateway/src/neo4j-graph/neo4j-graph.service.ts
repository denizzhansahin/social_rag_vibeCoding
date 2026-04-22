import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import { NetworkGraph, GraphNode, GraphLink } from './neo4j-graph.model';
import { RedisService } from '../common/redis/redis.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MatchingResult } from './matching-result.entity';

@Injectable()
export class Neo4jGraphService implements OnModuleInit, OnModuleDestroy {
  private driver: neo4j.Driver;
  private readonly logger = new Logger(Neo4jGraphService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  async onModuleInit() {
    try {
      this.driver = neo4j.driver(
        process.env.NEO4J_URI || 'bolt://127.0.0.1:7687',
        neo4j.auth.basic(
          process.env.NEO4J_USER || 'neo4j', 
          process.env.NEO4J_PASSWORD || 'ai_neo4j_password'
        )
      );
      await this.driver.getServerInfo();
      this.logger.log('✅ Bağlantı Kuruldu -> Neo4j Graph DB');
    } catch (error) {
      this.logger.error('❌ Neo4j Bağlantı Hatası:', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  async getNetworkGraph(): Promise<NetworkGraph> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 300
      `);

      const nodesMap = new Map<string, GraphNode>();
      const links: GraphLink[] = [];

      result.records.forEach((record) => {
        const sourceNode = record.get('n');
        const targetNode = record.get('m');
        const rel = record.get('r');

        const sourceId = sourceNode.properties.id || sourceNode.elementId;
        
        if (!nodesMap.has(sourceId)) {
          nodesMap.set(sourceId, {
            id: sourceId,
            name: sourceNode.properties.name || sourceNode.properties.label || sourceNode.properties.email || `Node-${sourceId.substring(0, 8)}`,
            label: sourceNode.labels[0] || 'Unknown',
            type: (sourceNode.labels[0] || 'Unknown').toLowerCase()
          });
        }

        if (targetNode) {
          const targetId = targetNode.properties.id || targetNode.elementId;
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              name: targetNode.properties.name || targetNode.properties.label || targetNode.properties.email || `Node-${targetId.substring(0, 8)}`,
              label: targetNode.labels[0] || 'Unknown',
              type: (targetNode.labels[0] || 'Unknown').toLowerCase()
            });
          }

          if (rel) {
            links.push({
              source: sourceId,
              target: targetId,
              label: rel.type
            });
          }
        }
      });

      return { nodes: Array.from(nodesMap.values()), links };
    } catch (e) {
      this.logger.error('Sorgu Hatası:', e);
      return { nodes: [], links: [] };
    } finally {
      await session.close();
    }
  }

  /** İzole kullanıcılar: Hiç edge'i olmayanlar */
  async getIsolatedUsers(): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Participant) WHERE NOT (n)--() RETURN n
        UNION
        MATCH (n:User) WHERE NOT (n)--() RETURN n
      `);
      return result.records.map(r => {
        const node = r.get('n');
        return { id: node.elementId, name: node.properties.name || node.properties.id, label: 'İzole' };
      });
    } finally { await session.close(); }
  }

  /** Çatışma riskleri: CONFLICT_RISK_WITH ilişkisi olan çiftler */
  async getConflictPairs(): Promise<GraphLink[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (a)-[r:CONFLICT_RISK_WITH]->(b)
        RETURN a.name AS source, b.name AS target, r.reason AS label, r.intensity AS intensity
      `);
      return result.records.map(r => ({
        source: r.get('source') || 'Unknown',
        target: r.get('target') || 'Unknown',
        label: `ÇATIŞMA: ${r.get('label') || ''} (Şiddet: ${r.get('intensity') || 'Bilinmiyor'})`
      }));
    } finally { await session.close(); }
  }

  /** Köprü düğümler: Farklı gruplarda bağlantısı olan kişiler */
  async getBridgeNodes(): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n)-[r]->(m)
        WHERE labels(n) <> labels(m) OR n.group <> m.group
        WITH n, count(DISTINCT m) AS connections
        WHERE connections >= 2
        RETURN n, connections
        ORDER BY connections DESC LIMIT 20
      `);
      return result.records.map(r => {
        const node = r.get('n');
        return { id: node.elementId, name: node.properties.name || 'Unknown', label: `Köprü (${r.get('connections')} bağ)` };
      });
    } finally { await session.close(); }
  }

  /** Gölge liderler: En çok gelen bağlantıya sahip düğümler */
  async getInfluencers(): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n)<-[r]-(m)
        WITH n, count(r) AS inDegree
        ORDER BY inDegree DESC LIMIT 10
        RETURN n, inDegree
      `);
      return result.records.map(r => {
        const node = r.get('n');
        return { id: node.elementId, name: node.properties.name || 'Unknown', label: `Lider (${r.get('inDegree')} takipçi)` };
      });
    } finally { await session.close(); }
  }

  async getPotentialMatches(): Promise<GraphLink[]> {
    try {
      // 1. Önce Postgres'teki kalıcı tablodan çek (Kullanıcı isimleriyle join yaparak)
      const matches = await this.dataSource.query(`
        SELECT 
          COALESCE(u1.cognitive_profile->>'name', u1.email) as source,
          COALESCE(u2.cognitive_profile->>'name', u2.email) as target,
          amr.similarity_score as score
        FROM ai_matching_results amr
        JOIN master_identities u1 ON u1.id = amr.user_a_id
        JOIN master_identities u2 ON u2.id = amr.user_b_id
        ORDER BY amr.similarity_score DESC
        LIMIT 50
      `);

      if (matches.length > 0) {
        return matches.map(m => ({
          source: m.source,
          target: m.target,
          label: `Eşleşme: %${Math.round(m.score * 100)}`
        }));
      }

      // 2. Eğer Postgres boşsa (henüz senkronize edilmemişse), Neo4j'den canlı çek
      const session = this.driver.session();
      try {
        const result = await session.run(`
          MATCH (a:User)-[r:POTENTIAL_FRIEND]-(b:User)
          RETURN 
            COALESCE(a.name, a.email, 'Bilinmeyen') AS source, 
            COALESCE(b.name, b.email, 'Bilinmeyen') AS target, 
            r.similarity_score AS score
          ORDER BY r.similarity_score DESC
          LIMIT 50
        `);
        return result.records.map(r => ({
          source: r.get('source'),
          target: r.get('target'),
          label: `Eşleşme: %${Math.round(r.get('score') * 100)}`
        }));
      } finally { await session.close(); }
    } catch (e) {
      this.logger.error('Eşleşme Çekme Hatası:', e);
      return [];
    }
  }

  async getPersistentMatches(): Promise<MatchingResult[]> {
    const rawData = await this.dataSource.query(`
      SELECT 
        m.id, 
        m.user_a_id as "userAId", 
        m.user_b_id as "userBId", 
        m.similarity_score as "similarityScore", 
        m.matched_at as "matchedAt",
        COALESCE(u1.cognitive_profile->>'name', u1.email::text) as "userAName",
        COALESCE(u2.cognitive_profile->>'name', u2.email::text) as "userBName",
        u2.role::text as role,
        COALESCE(u2.cognitive_profile->>'trait', u2.role::text) as trait
      FROM ai_matching_results m
      LEFT JOIN master_identities u1 ON m.user_a_id = u1.id
      LEFT JOIN master_identities u2 ON m.user_b_id = u2.id
      ORDER BY m.similarity_score DESC
      LIMIT 100
    `);
    return rawData;
  }

  async getMyMatches(userId: string): Promise<MatchingResult[]> {
    const rawData = await this.dataSource.query(`
      SELECT 
        m.id, 
        m.user_a_id as "userAId", 
        m.user_b_id as "userBId", 
        m.similarity_score as "similarityScore", 
        m.matched_at as "matchedAt",
        COALESCE(u1.cognitive_profile->>'name', u1.email::text) as "userAName",
        COALESCE(u2.cognitive_profile->>'name', u2.email::text) as "userBName",
        CASE WHEN m.user_a_id::text = $1 THEN CAST(u2.role AS TEXT) ELSE CAST(u1.role AS TEXT) END as role,
        CASE WHEN m.user_a_id::text = $1 THEN COALESCE(u2.cognitive_profile->>'trait', CAST(u2.role AS TEXT)) ELSE COALESCE(u1.cognitive_profile->>'trait', CAST(u1.role AS TEXT)) END as trait
      FROM ai_matching_results m
      LEFT JOIN master_identities u1 ON m.user_a_id = u1.id
      LEFT JOIN master_identities u2 ON m.user_b_id = u2.id
      WHERE (m.user_a_id::text = $1 OR m.user_b_id::text = $1)
      ORDER BY m.similarity_score DESC
      LIMIT 20
    `, [userId]);
    return rawData;
  }

  /** Belirli bir kullanıcının tüm bağlantıları */
  async getParticipantConnections(userName: string): Promise<NetworkGraph> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n {name: $name})-[r]-(m)
        RETURN n, r, m
      `, { name: userName });

      const nodesMap = new Map<string, GraphNode>();
      const links: GraphLink[] = [];
      result.records.forEach(record => {
        const src = record.get('n');
        const tgt = record.get('m');
        const rel = record.get('r');
        if (!nodesMap.has(src.elementId)) nodesMap.set(src.elementId, { id: src.elementId, name: src.properties.name, label: src.labels[0] });
        if (!nodesMap.has(tgt.elementId)) nodesMap.set(tgt.elementId, { id: tgt.elementId, name: tgt.properties.name, label: tgt.labels[0] });
        links.push({ source: src.elementId, target: tgt.elementId, label: rel.type });
      });
      return { nodes: Array.from(nodesMap.values()), links };
    } finally { await session.close(); }
  }

  /**
   * Bir grubun kendi içindeki etkileşim haritası
   */
  async getGroupNetworkGraph(groupId: string): Promise<NetworkGraph> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n)-[r]->(m)
        WHERE (n:Group {id: $groupId}) OR (m:Group {id: $groupId})
           OR (n:User)-[:MEMBER_OF]->(:Group {id: $groupId})
        RETURN n, r, m
        LIMIT 100
      `, { groupId });
      return this.parseGraphResult(result);
    } finally { await session.close(); }
  }

  async getDiscoveryRecommendations(userId: string): Promise<any[]> {
    console.log(`[Neo4jGraphService] Fetching discovery for: ${userId}`);
    const query = `
      WITH similarity AS (
        SELECT 
          CASE WHEN user_a_id::text = $1 THEN user_b_id ELSE user_a_id END as other_user_id,
          MAX(similarity_score) as score
        FROM ai_matching_results
        WHERE user_a_id::text = $1 OR user_b_id::text = $1
        GROUP BY 1
      ),
      all_targets AS (
        SELECT 
          u.id,
          COALESCE(u.cognitive_profile->>'name', u.email::text) as name,
          u.role::text as role,
          COALESCE(u.cognitive_profile->>'trait', u.role::text) as trait,
          COALESCE(s.score, 0) as similarity_score
        FROM master_identities u
        LEFT JOIN similarity s ON u.id = s.other_user_id
        WHERE u.id::text != $1 
          AND LOWER(u.role::text) != 'admin'
      ),
      participants AS (
        SELECT * FROM all_targets WHERE LOWER(role) LIKE '%participant%' OR LOWER(role) LIKE '%katilimci%' ORDER BY similarity_score DESC LIMIT 5
      ),
      mentors AS (
        SELECT * FROM all_targets WHERE LOWER(role) LIKE '%mentor%' ORDER BY similarity_score DESC LIMIT 2
      ),
      teachers AS (
        SELECT * FROM all_targets WHERE LOWER(role) LIKE '%teacher%' OR LOWER(role) LIKE '%egitmen%' ORDER BY similarity_score DESC LIMIT 2
      ),
      curated AS (
        SELECT * FROM participants
        UNION ALL
        SELECT * FROM mentors
        UNION ALL
        SELECT * FROM teachers
      ),
      fallback AS (
        SELECT * FROM all_targets 
        WHERE id NOT IN (SELECT id FROM curated)
        ORDER BY similarity_score DESC
        LIMIT 10
      )
      -- Return curated results. If curated is less than 3, mix in fallback.
      SELECT * FROM (
        SELECT * FROM curated
        UNION ALL
        SELECT * FROM fallback WHERE (SELECT COUNT(*) FROM curated) < 3
      ) final_results
      ORDER BY similarity_score DESC
      LIMIT 12;
    `;
    const results = await this.dataSource.query(query, [userId]);
    console.log(`[Neo4jGraphService] Discovery found ${results.length} total results.`);
    return results;
  }

  async triggerFullSync(): Promise<string> {
    await this.redisService.pushTaskToQueue('sync_full_graph', {});
    return "Full graph synchronization triggered.";
  }

  async getFilteredGraph(id: string, type: string): Promise<NetworkGraph> {
    const session = this.driver.session();
    try {
      // Find the node and its neighbors (2 degrees)
      const result = await session.run(`
        MATCH (n {id: $id})-[r*1..2]-(m)
        RETURN n, r, m
        LIMIT 100
      `, { id });
      return this.parseGraphResult(result);
    } finally { await session.close(); }
  }

  private parseGraphResult(result: any): NetworkGraph {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    result.records.forEach((record: any) => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      // Note: In nested paths r might be a list. We simplify for basic cases.
      const rels = Array.isArray(r) ? r : [r];

      [n, m].forEach(node => {
         if (node && !nodesMap.has(node.properties.id || node.elementId)) {
           const id = node.properties.id || node.elementId;
           nodesMap.set(id, {
             id,
             name: node.properties.name || node.properties.label || node.properties.email || id,
             label: node.labels[0] || 'Entity',
             type: (node.labels[0] || 'Entity').toLowerCase()
           });
         }
      });

      rels.forEach((rel: any) => {
        if (rel) {
          links.push({
            source: rel.startNodeElementId || n.properties.id || n.elementId,
            target: rel.endNodeElementId || m.properties.id || m.elementId,
            label: rel.type
          });
        }
      });
    });

    return { nodes: Array.from(nodesMap.values()), links };
  }

  async fixDatabaseConstraint(): Promise<string> {
    try {
      // 1. Duplicate kayıtları sil
      await this.dataSource.query(`
        DELETE FROM ai_matching_results
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
            ROW_NUMBER() OVER(PARTITION BY LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id) ORDER BY matched_at DESC) as rn
            FROM ai_matching_results
          ) t WHERE t.rn > 1
        );
      `);
      // 2. Constraint ekle
      try {
        await this.dataSource.query(`
          ALTER TABLE ai_matching_results 
          ADD CONSTRAINT unique_user_pairs UNIQUE(user_a_id, user_b_id);
        `);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
      }
      return 'OK: Constraint and duplicates fixed.';
    } catch (e: any) {
      return 'Error: ' + e.message;
    }
  }
}
