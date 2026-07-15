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

        # we explicitly inject the exact metadata that standard logging already captured!
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
    """Forces Uvicorn, RQ, and FastAPI to use Loguru."""
    logging.root.handlers = [LoggingInterceptHandler()]
    logging.root.setLevel(conf.logging.level.upper())

    # Remove all existing handlers from specific noisy libraries
    for name in logging.root.manager.loggerDict.keys():
        logging.getLogger(name).handlers = []
        logging.getLogger(name).propagate = True


def _setup_loguru_logging():
    """Sets up Loguru logging with a custom format."""
    logger.remove()
    LOGURU_FORMAT = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<magenta>PID: {process.id}</magenta> | "  # <-- Highlights which worker is logging!
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
