from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_annotation import SpanAnnotationCreate, SpanAnnotationUpdate
from app.core.data.orm.span_annotation import SpanAnnotationORM


class CRUDSpanAnnotation(CRUDBase[SpanAnnotationORM, SpanAnnotationCreate, SpanAnnotationUpdate]):
    pass


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
