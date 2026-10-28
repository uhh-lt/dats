from enum import Enum


class ApproachType(str, Enum):
    LLM_ZERO_SHOT = "LLM_ZERO_SHOT"
    LLM_FEW_SHOT = "LLM_FEW_SHOT"


class GroundingMethod(str, Enum):
    ANCHORED_EXACT = "anchored exact"
    QUOTE_EXACT = "quote exact"
    FUZZY = "fuzzy"
