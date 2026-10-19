"""Synchronous websocket event publishers for the job system.

These helpers run in sync contexts (RQ job workers, sync API code) and push
events onto the websocket Redis backplane. Emission must NEVER fail a job or
request, so every function swallows exceptions and only logs them.

The RQ worker is a pure producer: it never subscribes to the channel and never
touches the (async) `WebsocketService` connection manager. It only needs to
publish an envelope onto the Redis fan-out channel (from
`conf.redis.ws_fanout_channel`), which `_publish_envelope_sync` does with a
lazily-created, module-level sync client (cached for reuse across calls).

Imports are lazy (inside the functions) so this module stays import-light and
can be safely imported from `job_dto.py` without creating import cycles.
"""

from typing import TYPE_CHECKING, Any

from loguru import logger

from common.dats_event import DATSEvent, DATSEventBase
from systems.job_system.job_dto import Job, JobOutputBase

if TYPE_CHECKING:
    import redis

    from systems.websocket_system.websocket_dto import WebSocketEnvelope

# Module-level cached Redis client for the websocket fan-out channel (ws_idx).
# Lazily created on first publish; reused for the lifetime of the process.
_ws_redis_client: "redis.Redis | None" = None


def _get_ws_redis() -> "redis.Redis":
    """Return the cached sync Redis client for the websocket DB (ws_idx).

    Creates the client on first call. `redis.Redis` is thread-safe and
    designed to be long-lived, so we reuse a single instance.
    """
    global _ws_redis_client
    if _ws_redis_client is None:
        import redis

        from config import conf

        _ws_redis_client = redis.Redis(
            host=conf.redis.host,
            port=conf.redis.port,
            db=conf.redis.ws_idx,
            password=conf.redis.password.get_secret_value(),
        )
    return _ws_redis_client


def _publish_envelope_sync(envelope: "WebSocketEnvelope") -> None:
    """Publish an event envelope to the websocket Redis channel from a sync context.

    Used by RQ job workers (no event loop, no local connections) to push events
    onto the backplane; the API workers' Redis listeners deliver them to
    connected clients. Uses a cached sync client on the websocket DB index
    (`ws_idx`). Never raises.
    """
    try:
        from config import conf

        conn = _get_ws_redis()
        conn.publish(conf.redis.ws_fanout_channel, envelope.model_dump_json())
        logger.debug(
            f"Published websocket event '{envelope.message.type}' (sync) "
            f"(kind={envelope.kind}, user_ids={envelope.user_ids}) "
            f"to channel '{conf.redis.ws_fanout_channel}'"
        )
    except Exception as e:
        logger.error(
            f"Failed to publish websocket event (sync) "
            f"'{envelope.message.type}' to Redis: {e}"
        )


def _publish_to_project_users_sync(project_id: int, event: DATSEventBase) -> None:
    """Publish an event to all members of a project from a sync context.

    Resolves the project's member user ids and pushes the event onto the
    websocket Redis backplane. Never raises.
    """
    try:
        import os

        from core.project.project_crud import crud_project
        from repos.db.sql_repo import SQLRepo
        from systems.websocket_system.websocket_dto import WebSocketEnvelope

        with SQLRepo().transaction() as db:
            proj_db_obj = crud_project.read(db=db, id=project_id)
            user_ids = [user.id for user in proj_db_obj.users]

        if not user_ids:
            return

        envelope = WebSocketEnvelope(
            origin_worker=os.getpid(),
            kind="users",
            user_ids=user_ids,
            exclude_user_id=None,
            message=event,
        )
        _publish_envelope_sync(envelope)
    except Exception as e:
        logger.error(
            f"Failed to publish event '{event.type}' to project {project_id}: {e}"
        )


def publish_job_update(
    job: Job, output_override: JobOutputBase | Any | None = None
) -> None:
    """Publish a JOB_UPDATED event carrying the full per-type JobRead payload.

    Args:
        job: The job whose current state should be published.
        output_override: Explicit output to place on the JobRead. RQ only
            persists the return value AFTER the handler returns, so the final
            FINISHED event must pass the output explicitly. When None, falls
            back to `job.job.return_value()`.

    Never raises.
    """
    try:
        from common.dats_event import DATS_EVENT_TO_MODEL
        from systems.job_system.job_service import JobService

        # Internal jobs (e.g. doc-processing pipeline steps) are not published:
        if not job.publishes_updates():
            return

        # Build the payload with the concrete per-type JobRead model
        concrete_model = JobService().job_registry[job.get_type()]["read_model"]
        job_read = concrete_model.from_rq_job(job)
        if output_override is not None:
            job_read.output = output_override

        event_model = DATS_EVENT_TO_MODEL.get(DATSEvent.JOB_UPDATED)
        if event_model is None:
            logger.warning(
                "JOB_UPDATED event model not built "
                "(build_job_event_models() not called?), skipping job event"
            )
            return

        event = event_model(type=DATSEvent.JOB_UPDATED, payload=job_read)
        _publish_to_project_users_sync(job_read.project_id, event)
    except Exception as e:
        logger.error(f"Failed to publish job update for job {job.get_id()}: {e}")
