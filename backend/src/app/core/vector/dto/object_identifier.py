from abc import ABC, abstractmethod

from pydantic import BaseModel


class ObjectIdentifier(ABC, BaseModel):
    """
    Base class for object identifiers
    DO NOT include project_id in the identifier
    """

    @abstractmethod
    def __str__(self) -> str:
        """
        Returns the string representation of the identifier
        """
        pass
