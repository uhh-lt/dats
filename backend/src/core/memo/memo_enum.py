from enum import Enum


class AttachedObjectType(str, Enum):
    source_document = "source_document"
    code = "code"
    sentence_annotation = "sentence_annotation"
    span_annotation = "span_annotation"
    span_group = "span_group"
    bbox_annotation = "bbox_annotation"
    project = "project"
    tag = "tag"
