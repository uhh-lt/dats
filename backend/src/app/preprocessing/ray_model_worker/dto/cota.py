from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class RayCOTASentenceBase(BaseModel):
    concept_annotation: Optional[str] = Field(
        description="Concept ID this sentence belongs to"
    )
    text: str = Field(description="text of the sentence")


class RayCOTAJob(BaseModel):
    id: int = Field(description="ID of the ConceptOverTimeAnalysis")
    project_id: int = Field(
        description="Project the ConceptOverTimeAnalysis belongs to"
    )


class RayCOTAJobInput(RayCOTAJob):
    concept_ids: List[str] = Field(
        description="List of Concepts Ids that are part of the ConceptOverTimeAnalysis"
    )
    search_space: List[RayCOTASentenceBase] = Field(
        description=(
            "List of Sentences that form the search space of the ConceptOverTimeAnalysis"
        ),
    )


class RayCOTAJobResponse(RayCOTAJob):
    visual_refined_embeddings: List[List[float]] = Field(
        description=(
            "List of Tuples of the x and y coordinates of the sentence in the Search Space"
        ),
    )
    concept_similarities: Dict[str, List[float]] = Field(
        description="DDictionary of Concept IDs and their similarity score to each sentence"
    )
    probabilities: List[List[float]] = Field(
        description="List of concept classification probability scores for each sentence"
    )
