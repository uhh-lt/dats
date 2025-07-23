from abc import ABCMeta
from typing import Type, TypeVar

from loguru import logger

SingletonInstance = TypeVar("SingletonInstance")


class SingletonMeta(ABCMeta):
    def __init__(cls, class_name, bases, attrs):
        cls.__singleton = None
        logger.info(f"Instantiating {class_name} Singleton...")
        super().__init__(class_name, bases, attrs)

    def __call__(cls: Type[SingletonInstance], *args, **kwargs) -> SingletonInstance:
        # Not sure if there's a way to typehint the __singleton
        # attribute somehow.
        if cls.__singleton:  # type: ignore
            return cls.__singleton  # type: ignore
        singleton = cls.__new__(cls, *args, **kwargs)
        singleton.__init__(*args, **kwargs)
        cls.__singleton = singleton  # type: ignore
        return singleton
