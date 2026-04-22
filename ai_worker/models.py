from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID


# Redis'ten gelen ana görev paketinin şeması
class RedisTask(BaseModel):
    task_name: str
    payload: Dict[str, Any]


# Mentor değerlendirmesini analiz etme görevinin payload'u
class MentorEvaluationPayload(BaseModel):
    evaluation_id: UUID


# Anket cevabını vektöre çevirme görevinin payload'u
class VectorizationPayload(BaseModel):
    engagement_id: UUID


# AI'ın bir metinden çıkardığı ve Postgres'e yazacağımız JSON yapısı
class AIExtractedInsights(BaseModel):
    sentiment_score: float = Field(..., description="Duygu skoru (-1.0 ile 1.0 arası)")
    detected_traits: List[str] = Field(default_factory=list, description="Tespit edilen karakter özellikleri")
    needs_intervention: bool = Field(False, description="Müdahale gerektirip gerektirmediği")
    intervention_reason: Optional[str] = None
    belbin_role_suggestion: Optional[str] = None


# Neo4j'ye yazılacak ilişki payload'u
class Neo4jRelationPayload(BaseModel):
    source_id: UUID
    target_id: UUID
    relation_type: str
    properties: Dict[str, Any] = Field(default_factory=dict)
