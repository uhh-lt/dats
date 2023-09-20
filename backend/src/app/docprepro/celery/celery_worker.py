import inspect
from typing import Dict

from celery import Celery
from config import conf

cc = conf.docprepro.celery


class CeleryConfig:
    # Flo: we cannot use standard (json) serialization because we need to serialize full python objects via pickle
    task_serializer = "pickle"
    result_serializer = "pickle"
    event_serializer = "json"
    accept_content = ["application/json", "application/x-python-serialize"]
    result_accept_content = ["application/json", "application/x-python-serialize"]
    task_track_started = True

    # https://docs.celeryq.dev/en/stable/userguide/routing.html
    task_routes = {
        "app.docprepro.audio.preprocess.*": {"queue": "audioQ"},
        "app.docprepro.text.preprocess.*": {"queue": "textQ"},
        "app.docprepro.video.preprocess.*": {"queue": "videoQ"},
        "app.docprepro.image.preprocess.*": {"queue": "imageQ"},
        "app.docprepro.heavy_jobs.tasks.*": {"queue": "heavyjobsQ"},
        "app.docprepro.simsearch.preprocess.*": {"queue": "simsearchQ"},
    }

    def to_dict(self) -> Dict:
        d = {}
        for attr in dir(self):
            value = getattr(self, attr)
            if not attr.startswith("__") and not inspect.ismethod(value):
                d[attr] = value
        return d


# Flo: Setup the celery worker with Redis backend (for results) and RabbitMQ broker (for message passing)
celery_worker = Celery(
    "celery_worker",
    backend=f"redis://:{cc.backend.password}@{cc.backend.host}:{cc.backend.port}/{cc.backend.db}",
    broker=f"amqp://{cc.broker.user}:{cc.broker.password}@{cc.broker.host}:{cc.broker.port}//",
)

# Flo: config the celery worker with the CommonConfig (serialization and event format etc)
celery_worker.config_from_object(CeleryConfig)
