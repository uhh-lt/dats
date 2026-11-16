from datetime import date, datetime
from enum import Enum

from sqlalchemy import func
from sqlalchemy.orm.attributes import InstrumentedAttribute


class DateGroupBy(str, Enum):
    YEAR = "YEAR"
    MONTH = "MONTH"
    DAY = "DAY"

    def apply(self, column: InstrumentedAttribute[datetime | date]) -> list:
        match self:
            case DateGroupBy.YEAR:
                return [func.extract("year", column)]
            case DateGroupBy.MONTH:
                return [func.extract("year", column), func.extract("month", column)]
            case DateGroupBy.DAY:
                return [
                    func.extract("year", column),
                    func.extract("month", column),
                    func.extract("day", column),
                ]
