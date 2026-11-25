from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class NoDataToCrawlError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


class CrawlerScriptFailedError(Exception):
    """Raised when the crawler script fails or writes no archive of the crawled
    pages."""

    def __init__(self, returncode: int) -> None:
        super().__init__(
            f"The crawler failed (exit code {returncode}) and crawled no pages."
        )
