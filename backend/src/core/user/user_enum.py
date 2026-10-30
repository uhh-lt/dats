from enum import StrEnum


class UserKind(StrEnum):
    """Whether a user is a person with a login or a virtual annotator.

    Virtual annotators belong to exactly one project and only own annotations
    (e.g. the output of an LLM Assistant run). They have no email and no
    password, can never log in and are no project members.
    """

    HUMAN = "human"
    VIRTUAL = "virtual"
