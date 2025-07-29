from pathlib import Path

from preprocessing.pipeline.model.preprodoc_base import PreProDocBase
from preprocessing.pipeline.model.text.autosentanno import AutoSentAnno
from preprocessing.pipeline.model.text.autospan import AutoSpan
from preprocessing.pipeline.model.text.sentence import Sentence
from pydantic import Field
from ray_model_worker.dto.spacy import SpacyPipelineOutput


class PreProTextDoc(PreProDocBase):
    text: str = Field(default="")
    html: str = Field(default="")
    spacy_pipeline_output: SpacyPipelineOutput | None = Field(default=None)
    tokens: list[str] = Field(default_factory=list)
    token_character_offsets: list[tuple[int, int]] = Field(default_factory=list)
    text2html_character_offsets: list[int] = Field(default_factory=list)
    html_filepath: Path = Field(default_factory=Path)
    lemmas: list[str] = Field(default_factory=list)
    pos: list[str] = Field(default_factory=list)
    stopwords: list[bool] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    word_freqs: dict[str, int] = Field(default_factory=dict)
    spans: dict[str, set[AutoSpan]] = Field(default_factory=dict)
    sent_annos: dict[str, set[AutoSentAnno]] = Field(default_factory=dict)
    sentences: list[Sentence] = Field(default_factory=list)
    extracted_images: list[Path] = Field(default_factory=list)
