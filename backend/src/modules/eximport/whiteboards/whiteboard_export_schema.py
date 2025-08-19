from typing import Literal

import pandas as pd
from pydantic import BaseModel, Field, field_validator

from modules.whiteboard.whiteboard_dto import (
    BorderNodeData,
    NoteNodeData,
    TextNodeData,
    WhiteboardBackgroundColorData,
    WhiteboardContent,
    WhiteboardNode,
    WhiteboardNodeType,
)


class SdocNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SDOC]
    sdoc_filename: str = Field(description="Filename of the source document")


class MemoNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.MEMO]
    memoId: int = Field(description="ID of the memo")


class CodeNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.CODE]
    code_name: str = Field(description="Name of the code")
    parent_code_name: str | None = Field(
        description="Name of the parent code",
        default=None,
    )


class TagNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.TAG]
    tag_name: str = Field(description="Name of the tag")


class SpanAnnotationNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SPAN_ANNOTATION]
    span_annotation_uuid: str = Field(
        description="UUID of the span annotation",
    )


class SentenceAnnotationNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.SENTENCE_ANNOTATION]
    sentence_annotation_uuid: str = Field(
        description="UUID of the sentence annotation",
    )


class BBoxAnnotationNodeDataForExport(WhiteboardBackgroundColorData):
    type: Literal[WhiteboardNodeType.BBOX_ANNOTATION]
    bbox_annotation_uuid: str = Field(
        description="UUID of the bbox annotation",
    )


class WhiteboardNodeForExport(WhiteboardNode):
    data: (
        TextNodeData
        | NoteNodeData
        | BorderNodeData
        | SdocNodeDataForExport
        | MemoNodeDataForExport
        | CodeNodeDataForExport
        | TagNodeDataForExport
        | SpanAnnotationNodeDataForExport
        | SentenceAnnotationNodeDataForExport
        | BBoxAnnotationNodeDataForExport
    ) = Field(
        description="Data of the node",
        discriminator="type",
    )


class WhiteboardContentForExport(WhiteboardContent):
    nodes: list[WhiteboardNodeForExport] = Field(
        description="List of nodes in the whiteboard content",
    )


class WhiteboardExportSchema(BaseModel):
    """Schema definition for whiteboard export/import operations."""

    title: str = Field(description="Title of the whiteboard")
    content: str = Field(description="JSON content of the whiteboard")

    @field_validator("title", "content")
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or v.strip() == "":
            raise ValueError(f"{info.field_name} cannot be empty")
        return v

    @field_validator("content")
    @classmethod
    def validate_content_json(cls, v):
        """Validate that the content field is a valid JSON string that can be parsed
        as WhiteboardContentForExport."""
        if not v or v.strip() == "":
            return v

        try:
            # Validate using the WhiteboardContentForExport schema
            WhiteboardContentForExport.model_validate_json(v)
        except Exception as e:
            raise ValueError(f"Invalid content JSON format: {str(e)}")

        return v


class WhiteboardExportCollection(BaseModel):
    """Collection of whiteboards for export/import operations."""

    whiteboards: list[WhiteboardExportSchema]

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "WhiteboardExportCollection":
        """Convert a DataFrame to a WhiteboardExportCollection."""
        # Replace NaN values with None before converting to dict
        df_cleaned = df.replace({pd.NA: None, float("nan"): None, "nan": None})
        records = df_cleaned.to_dict("records")
        whiteboards = [WhiteboardExportSchema(**record) for record in records]  # type: ignore
        return cls(whiteboards=whiteboards)

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the WhiteboardExportCollection to a DataFrame."""
        records = [whiteboard.model_dump() for whiteboard in self.whiteboards]
        return pd.DataFrame(records)
