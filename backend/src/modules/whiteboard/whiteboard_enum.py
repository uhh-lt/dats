from enum import Enum


class BorderStyle(str, Enum):
    SOLID = "solid"
    DASHED = "dashed"
    DOTTED = "dotted"


class HorizontalAlign(str, Enum):
    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


class VerticalAlign(str, Enum):
    TOP = "top"
    CENTER = "center"
    BOTTOM = "bottom"


class WhiteboardNodeType(str, Enum):
    TEXT = "text"
    NOTE = "note"
    BORDER = "border"
    SDOC = "sdoc"
    MEMO = "memo"
    CODE = "code"
    TAG = "tag"
    SPAN_ANNOTATION = "spanAnnotation"
    SENTENCE_ANNOTATION = "sentenceAnnotation"
    BBOX_ANNOTATION = "bboxAnnotation"


class WhiteboardEdgeType(str, Enum):
    BEZIER = "bezier"
    STRAIGHT = "straight"
    SIMPLEBEZIER = "simplebezier"
    SMOOTHSTEP = "smoothstep"
