from typing import List, Optional

from pydantic import BaseModel, Field


class RayCOTASentence(BaseModel):
    concept_annotation: Optional[str] = Field(
        description="Concept ID this sentence belongs to"
    )
    text: str = Field(description="text of the sentence")


class RayCOTARefinementJob(BaseModel):
    id: int = Field(description="ID of the ConceptOverTimeAnalysis")
    project_id: int = Field(
        description="Project the ConceptOverTimeAnalysis belongs to"
    )
    min_required_annotations_per_concept: int = Field(
        description="Minimum number of annotations per concept required to train the CEM.",
        default=5,
    )
    concept_ids: List[str] = Field(
        description="List of Concepts Ids that are part of the ConceptOverTimeAnalysis"
    )
    search_space: List[RayCOTASentence] = Field(
        description=(
            "List of Sentences that form the search space "
            "of the ConceptOverTimeAnalysis"
        ),
    )
