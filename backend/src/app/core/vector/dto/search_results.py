from typing import Generic, TypeVar

from app.core.vector.dto.object_identifier import ObjectIdentifier
from pydantic import BaseModel
from weaviate.types import UUID

T = TypeVar("T", bound=ObjectIdentifier)


class SimSearchResult(BaseModel, Generic[T]):
    uuid: UUID
    id: T
    score: float


class EmbeddingSearchResult(BaseModel, Generic[T]):
    uuid: UUID
    id: T
    embedding: list[float]
