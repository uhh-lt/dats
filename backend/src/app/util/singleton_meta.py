from abc import ABCMeta

from loguru import logger


class SingletonMeta(ABCMeta):
    def __init__(cls, class_name, bases, attrs):
        cls.__singleton = None
        logger.info(f"Instantiating {class_name} Singleton...")
        super().__init__(class_name, bases, attrs)

    def __call__(cls, *args, **kwargs):
        if cls.__singleton:
            return cls.__singleton
        singleton = cls.__new__(cls, *args, **kwargs)
        singleton.__init__(*args, **kwargs)
        cls.__singleton = singleton
        return singleton
