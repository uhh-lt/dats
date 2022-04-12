from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_group import SpanGroupCreate, SpanGroupUpdate
from app.core.data.orm.span_group import SpanGroupORM


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreate, SpanGroupUpdate]):
    pass


crud_span_group = CRUDSpanGroup(SpanGroupORM)
