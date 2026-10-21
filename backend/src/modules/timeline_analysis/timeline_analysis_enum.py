from enum import Enum


class TimelineAnalysisType(str, Enum):
    DOCUMENT = "document"
    SENT_ANNO = "sentence_annotation"
    SPAN_ANNO = "span_annotation"
    BBOX_ANNO = "bbox_annotation"


class TAAnnotationAggregationType(str, Enum):
    UNIT = "unit"
    ANNOTATION = "annotation"
    DOCUMENT = "document"
