from sqlalchemy import Integer, func
from sqlalchemy.dialects.postgresql import ARRAY, aggregate_order_by, array_agg
from sqlalchemy.orm import InstrumentedAttribute


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(aggregate_order_by(column.distinct(), column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


def aggregate_two_ids(
    column1: InstrumentedAttribute, column2: InstrumentedAttribute, label: str
):
    return func.array_remove(
        func.array_cat(
            array_agg(
                aggregate_order_by(column1.distinct(), column1), type_=ARRAY(Integer)
            ),
            array_agg(
                aggregate_order_by(column2.distinct(), column2), type_=ARRAY(Integer)
            ),
        ),
        None,
        type_=ARRAY(Integer),
    ).label(label)
