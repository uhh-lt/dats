from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pydantic import Field

from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.ray_model_worker.dto.spacy import SpacyPipelineOutput


class PreProTextDoc(PreProDocBase):
    text: str = Field(default="")
    html: str = Field(default="")
    spacy_pipeline_output: Optional[SpacyPipelineOutput] = Field(default=None)
    tokens: List[str] = Field(default_factory=list)
    token_character_offsets: List[Tuple[int, int]] = Field(default_factory=list)
    text2html_character_offsets: List[int] = Field(default_factory=list)
    html_filepath: Path = Field(default_factory=Path)
    lemmas: List[str] = Field(default_factory=list)
    pos: List[str] = Field(default_factory=list)
    stopwords: List[bool] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    word_freqs: Dict[str, int] = Field(default_factory=dict)
    spans: Dict[str, List[AutoSpan]] = Field(default_factory=dict)
    sentences: List[AutoSpan] = Field(default_factory=list)
    sdoc_link_create_dtos: List[SourceDocumentLinkCreate] = Field(default_factory=list)
    extracted_images: List[Path] = Field(default_factory=list)
