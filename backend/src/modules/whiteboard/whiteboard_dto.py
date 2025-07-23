from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from core.annotation.bbox_annotation_dto import BBoxAnnotationRead
from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.code.code_dto import CodeRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import MemoRead
from core.tag.document_tag_dto import DocumentTagRead
from pydantic import BaseModel, ConfigDict, Field, field_validator
from repos.db.dto_base import UpdateDTOBase

# --- DATA START ---


class BorderStyle(str, Enum):
    SOLID = "solid"
    DASHED = "dashed"
    DOTTED = "dotted"


class WhiteboardBorderData(BaseModel):
    borderColor: str = Field(description="Color of the border")
    borderRadius: str = Field(description="Radius of the border")
    borderWidth: int = Field(description="Width of the border")
    borderStyle: BorderStyle = Field(description="Style of the border")


class WhiteboardBackgroundColorData(BaseModel):
    bgcolor: str = Field(description="Background color of the text")
    bgalpha: Optional[float] = Field(description="Background color alpha of the text")


class HorizontalAlign(str, Enum):
    LEFT = "left"
    CENTER = "center"
    RIGHT = "right"


class VerticalAlign(str, Enum):
    TOP = "top"
    CENTER = "center"
    BOTTOM = "bottom"


class WhiteboardTextData(BaseModel):
    text: str = Field(description="Text of the text")
    color: str = Field(description="Text color of the text")
    horizontalAlign: HorizontalAlign = Field(
        description="Horizontal alignment of the text"
    )
    verticalAlign: VerticalAlign = Field(description="Vertical alignment of the text")
    bold: bool = Field(description="Boldness of the text")
    italic: bool = Field(description="Italicness of the text")
    underline: bool = Field(description="Underlinedness of the text")
    strikethrough: bool = Field(description="Strikethroughness of the text")
    fontSize: int = Field(description="Font size of the text")
    fontFamily: str = Field(description="Font family of the text")


# --- DATA END ---


# --- NODES START ---


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


class TextNodeData(WhiteboardTextData):
    type: Literal[WhiteboardNodeType.TEXT]


class NoteNodeData(WhiteboardBackgroundColorData, WhiteboardTextData):
    type: Literal[WhiteboardNodeType.NOTE]


class BorderNodeData(
    WhiteboardBackgroundColorData, WhiteboardTextData, WhiteboardBorderData
):
    type: Literal[WhiteboardNodeType.BORDER]


class SdocNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SDOC]
    sdocId: int = Field(description="ID of the source document")


class MemoNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.MEMO]
    memoId: int = Field(description="ID of the memo")


class CodeNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.CODE]
    codeId: int = Field(description="ID of the code")
    parentCodeId: Optional[int] = Field(
        description="ID of the parent code",
        default=None,
    )


class TagNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.TAG]
    tagId: int = Field(description="ID of the tag")


class SpanAnnotationNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SPAN_ANNOTATION]
    spanAnnotationId: int = Field(
        description="ID of the span annotation",
    )


class SentenceAnnotationNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SENTENCE_ANNOTATION]
    sentenceAnnotationId: int = Field(
        description="ID of the sentence annotation",
    )


class BBoxAnnotationNodeData(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.BBOX_ANNOTATION]
    bboxAnnotationId: int = Field(
        description="ID of the bbox annotation",
    )


class XYPosition(BaseModel):
    x: float = Field(description="X coordinate of the position")
    y: float = Field(description="Y coordinate of the position")


class WhiteboardNode(BaseModel):
    id: str = Field(description="ID of the node")
    type: Union[WhiteboardNodeType, str] = Field(
        description="Type of the node", default=WhiteboardNodeType.TEXT
    )
    data: Union[
        TextNodeData,
        NoteNodeData,
        BorderNodeData,
        SdocNodeData,
        MemoNodeData,
        CodeNodeData,
        TagNodeData,
        SpanAnnotationNodeData,
        SentenceAnnotationNodeData,
        BBoxAnnotationNodeData,
    ] = Field(
        description="Data of the node",
        discriminator="type",
    )
    position: XYPosition = Field(
        description="Position of the node",
    )
    width: Optional[float] = Field(
        description="Width of the node",
        default=None,
    )
    height: Optional[float] = Field(
        description="Height of the node",
        default=None,
    )
    style: Dict[str, Any] = Field(
        description="Style of the node",
        default={},
    )

    model_config = ConfigDict(
        # This tells Pydantic to ignore extra fields
        extra="ignore",
    )


# --- NODES END ---

# --- EDGES START ---


class WhiteboardEdgeLabelData(WhiteboardBackgroundColorData, WhiteboardTextData):
    pass


class WhiteboardEdgeType(str, Enum):
    BEZIER = "bezier"
    STRAIGHT = "straight"
    SIMPLEBEZIER = "simplebezier"
    SMOOTHSTEP = "smoothstep"


class WhiteboardEdgeData(BaseModel):
    type: WhiteboardEdgeType = Field(description="Type of the edge")
    label: WhiteboardEdgeLabelData


class WhiteboardEdge(BaseModel):
    id: str = Field(description="ID of the edge")
    type: Optional[str] = Field(description="Type of the edge", default=None)
    source: str = Field(description="Source node ID")
    sourceHandle: Optional[str] = Field(
        description="Source handle position", default=None
    )
    target: str = Field(description="Target node ID")
    targetHandle: Optional[str] = Field(
        description="Target handle position", default=None
    )
    data: Optional[WhiteboardEdgeData] = Field(
        description="Data of the edge", default=None
    )

    style: Optional[Dict[str, Any]] = Field(
        description="Style of the edge",
        default=None,
    )
    markerEnd: Union[Dict[str, Any], str] = Field(
        description="Marker end of the edge",
        default="",
    )
    markerStart: Union[Dict[str, Any], str] = Field(
        description="Marker start of the edge",
        default="",
    )

    model_config = ConfigDict(
        # This tells Pydantic to ignore extra fields
        extra="ignore",
    )


# --- EDGES END ---

# --- DATA START ---


class WhiteboardData(BaseModel):
    sdocs: List[SourceDocumentRead] = Field(
        description="List of source documents",
    )
    codes: List[CodeRead] = Field(
        description="List of codes",
    )
    tags: List[DocumentTagRead] = Field(
        description="List of tags",
    )
    span_annotations: List[SpanAnnotationRead] = Field(
        description="List of span annotations",
    )
    sent_annotations: List[SentenceAnnotationRead] = Field(
        description="List of sentence annotations",
    )
    bbox_annotations: List[BBoxAnnotationRead] = Field(
        description="List of bbox annotations",
    )
    memos: List[MemoRead] = Field(
        description="List of memos",
    )


# --- DATA END ---

# --- CRUD DTOS START ---


class WhiteboardContent(BaseModel):
    nodes: List[WhiteboardNode] = Field(description="Nodes of the Whiteboard")
    edges: List[WhiteboardEdge] = Field(description="Edges of the Whiteboard")


# Properties shared across all DTOs
class WhiteboardBaseDTO(BaseModel):
    title: str = Field(description="Title of the Whiteboard")


# Properties for creation
class WhiteboardCreate(WhiteboardBaseDTO):
    project_id: int = Field(description="Project the Whiteboard belongs to")


class WhiteboardCreateIntern(WhiteboardCreate):
    user_id: int = Field(description="User the Whiteboard belongs to")
    content: Optional[str] = Field(
        description="Content of the Whiteboard", default=None
    )


# Properties for updating
class WhiteboardUpdate(BaseModel, UpdateDTOBase):
    title: Optional[str] = Field(
        description="Title of the Whiteboard",
        default=None,
    )
    content: Optional[WhiteboardContent] = Field(
        description="Conten of the Whiteboard", default=None
    )


class WhiteboardUpdateIntern(BaseModel, UpdateDTOBase):
    title: Optional[str] = Field(
        description="Title of the Whiteboard",
        default=None,
    )
    content: Optional[str] = Field(
        description="Content of the Whiteboard",
        default=None,
    )


# Properties for reading (as in ORM)
class WhiteboardRead(WhiteboardBaseDTO):
    id: int = Field(description="ID of the Whiteboard")
    project_id: int = Field(description="Project the Whiteboard belongs to")
    user_id: int = Field(description="User the Whiteboard belongs to")
    created: datetime = Field(description="Created timestamp of the Whiteboard")
    updated: datetime = Field(description="Updated timestamp of the Whiteboard")
    content: WhiteboardContent = Field(description="Content of the Whiteboard")

    @field_validator("content", mode="before")
    @classmethod
    def json_loads_content(cls, v: str) -> WhiteboardContent:
        return WhiteboardContent.model_validate_json(v)

    model_config = ConfigDict(from_attributes=True)


# --- CRUD DTOS END ---
