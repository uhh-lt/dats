from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class AnnotationSourceError(Exception):
    """
    Raised when an annotation is copied from an annotation that does not annotate the
    same source document of the same project.
    """

    def __init__(self, source_annotation_id: int, sdoc_id: int) -> None:
        self.source_annotation_id = source_annotation_id
        self.sdoc_id = sdoc_id
        super().__init__(
            f"Annotation {source_annotation_id} cannot be copied: it does not "
            f"annotate source document {sdoc_id} of the same project."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class EmptySpanAnnotationError(Exception):
    """
    Raised when a span annotation would cover no character or no token. Character
    and token ends are exclusive, so a span needs begin < end and
    begin_token < end_token.
    """

    def __init__(self, begin: int, end: int, begin_token: int, end_token: int) -> None:
        super().__init__(
            f"A span annotation must not be empty: characters {begin}-{end} and "
            f"tokens {begin_token}-{end_token} (exclusive ends) must each cover at "
            "least one."
        )
