import logging
import sys

from loguru import logger

from config import conf


class LoggingInterceptHandler(logging.Handler):
    """Intercept standard logging messages and route them to Loguru."""

    def emit(self, record: logging.LogRecord):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Inject the exact metadata that standard logging captured
        logger_with_overrides = logger.patch(
            lambda log_record: log_record.update(
                {
                    "name": record.name,
                    "function": record.funcName,
                    "line": record.lineno,
                }
            )
        )

        logger_with_overrides.opt(exception=record.exc_info).log(
            level, record.getMessage()
        )


def _hijack_standard_loggers():
    """Forces Uvicorn, RQ, and FastAPI to use Loguru, while keeping the rest of Python quiet."""

    # 1. Attach our interceptor to the Root Logger
    logging.root.handlers = [LoggingInterceptHandler()]

    # 2. Explicitly set the standard Root Logger to WARNING.
    logging.root.setLevel(logging.WARNING)

    # 3. Strip handlers from libraries that normally print (Uvicorn/RQ)
    for name in logging.root.manager.loggerDict.keys():
        logging_logger = logging.getLogger(name)
        logging_logger.handlers = []
        logging_logger.propagate = True


def _setup_loguru_logging():
    """Sets up Loguru logging with a custom format."""
    logger.remove()

    LOGURU_FORMAT = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<magenta>PID: {process.id}</magenta> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )

    logger.add(
        sys.stderr,
        level=conf.logging.level.upper(),
        format=LOGURU_FORMAT,
        colorize=True,
    )


def setup_logging():
    """Sets up logging for the application."""
    _setup_loguru_logging()
    _hijack_standard_loggers()
