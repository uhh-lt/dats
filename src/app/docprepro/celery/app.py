from celery import Celery

from config import conf

cc = conf.docprepro.celery

celery_app = Celery(
    "docprepro_worker",
    backend=f"redis://:{cc.backend.password}@{cc.backend.host}:{cc.backend.port}/{cc.backend.db}",
    broker=f"amqp://{cc.broker.user}:{cc.broker.password}@{cc.broker.host}:{cc.broker.port}//"
)


# Flo: we cannot use standard (json) serialization because we need to serialize full python objects via pickle
class CeleryConfig:
    task_serializer = "pickle"
    result_serializer = "pickle"
    event_serializer = "json"
    accept_content = ["application/json", "application/x-python-serialize"]
    result_accept_content = ["application/json", "application/x-python-serialize"]


celery_app.config_from_object(CeleryConfig)

celery_app.conf.update(task_track_started=True)
