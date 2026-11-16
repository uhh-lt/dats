from enum import StrEnum


class TagRecommendationMethod(StrEnum):
    SIMPLE = "SIMPLE"
    KNN = "KNN"
    EXCLUSIVE = "EXCLUSIVE"
