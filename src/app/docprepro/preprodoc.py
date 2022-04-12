from typing import List, Dict

from pydantic import BaseModel, Field

from app.docprepro.autospan import AutoSpan


class PreProDoc(BaseModel):
    project_id: int
    sdoc_id: int
    raw_text: str
    metadata: Dict[str, str] = Field(default=dict())

    tokens: List[str] = Field(default=list())
    lemmas: List[str] = Field(default=list())
    pos: List[str] = Field(default=list())
    stopwords: List[bool] = Field(default=list())
    keywords: List[str] = Field(default=list())
    word_freqs: Dict[str, int] = Field(default=dict())
    spans: Dict[str, List[AutoSpan]] = Field(default=dict())
