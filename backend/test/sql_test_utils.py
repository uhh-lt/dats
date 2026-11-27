from collections.abc import Callable, Iterator
from contextlib import contextmanager

from sqlalchemy import event
from sqlalchemy.orm import Session


@contextmanager
def count_queries(db: Session) -> Iterator[Callable[[], int]]:
    """Count the SQL statements the session executes inside the block."""
    count = 0

    def on_execute(*args: object, **kwargs: object) -> None:
        nonlocal count
        count += 1

    engine = db.get_bind()
    event.listen(engine, "before_cursor_execute", on_execute)
    try:
        yield lambda: count
    finally:
        event.remove(engine, "before_cursor_execute", on_execute)
