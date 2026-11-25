from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class AnnotationSourceError(Exception):
    """
    Raised when an annotation is copied from an annotation that does not annotate the
    same source document.
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


@exception_handler(status.HTTP_409_CONFLICT)
class AnnotationDocumentOfAnotherProjectError(Exception):
    """
    Raised when a user's annotation document of a source document belongs to another
    project than the request's: the source document is of another project, like a
    reference that fails at a composite foreign key.
    """

    def __init__(self, project_id: int, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"The source documents {sdoc_ids} do not belong to project {project_id}."
        )
