from enum import Enum


class ProviderType(str, Enum):
    LLM = "llm"
    EMB = "emb"
