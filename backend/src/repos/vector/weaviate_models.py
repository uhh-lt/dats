import uuid
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from pydantic import BaseModel
from weaviate.types import UUID

from config import conf


class ObjectIdentifier(ABC, BaseModel):
    """
    Base class for object identifiers
    DO NOT include project_id in the identifier
    """

    UUID_NAMESPACE: uuid.UUID = uuid.UUID(conf.api.uuid_namespace)

    def uuidv5(self) -> str:
        """
        Returns the UUIDv5 of the identifier based on the given namespace
        """
        return str(
            uuid.uuid5(
                self.UUID_NAMESPACE,
                str(self),
            )
        )

    @abstractmethod
    def __str__(self) -> str:
        """
        Returns the string representation of the identifier
        """
        pass


T = TypeVar("T", bound=ObjectIdentifier)


class SimSearchResult(BaseModel, Generic[T]):
    uuid: UUID
    id: T
    score: float


class EmbeddingSearchResult(BaseModel, Generic[T]):
    uuid: UUID
    id: T
    embedding: list[float]
