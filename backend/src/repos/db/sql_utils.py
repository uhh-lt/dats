from collections.abc import Sequence

from sqlalchemy import Integer, func, inspect
from sqlalchemy.dialects.postgresql import ARRAY, array_agg
from sqlalchemy.orm import InstrumentedAttribute

from repos.db.orm_base import ORMBase
from repos.db.sql_exceptions import NoSuchElementError


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


def aggregate_two_ids(
    column1: InstrumentedAttribute, column2: InstrumentedAttribute, label: str
):
    return func.array_remove(
        func.array_cat(
            array_agg(func.distinct(column1), type_=ARRAY(Integer)),
            array_agg(func.distinct(column2), type_=ARRAY(Integer)),
        ),
        None,
        type_=ARRAY(Integer),
    ).label(label)


def assert_in_project(db_objs: Sequence[ORMBase], *, project_id: int) -> None:
    """
    For the tables whose CRUD does not take the project yet: an object of another
    project does not exist within the project of a request.

    Raises:
        NoSuchElementError: For the first object of another project.
    """
    for db_obj in db_objs:
        if db_obj.get_project_id() != project_id:
            identity = inspect(db_obj).identity
            raise NoSuchElementError(
                type(db_obj),
                project_id=project_id,
                id=identity[0] if identity else None,
            )
