from enum import Enum


class ClassifierModel(str, Enum):
    DOCUMENT = "document"
    SENTENCE = "sentence"
    SPAN = "span"


class ClassifierTask(str, Enum):
    TRAINING = "training"
    EVALUATION = "evaluation"
    INFERENCE = "inference"


class ClassifierAveraging(str, Enum):
    MICRO = "micro"
    MACRO = "macro"


class ClassifierSignalStrength(str, Enum):
    WEAK = "weak"
    OK = "ok"
    STRONG = "strong"
