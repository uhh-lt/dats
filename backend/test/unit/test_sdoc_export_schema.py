from typing import Any

import pytest
from pydantic import ValidationError

from modules.eximport.sdocs.sdoc_export_schema import SourceDocumentExportSchema

# A consistent text document with two tokens and two sentences.
VALID_SDOC: dict[str, Any] = {
    "filename": "a.txt",
    "name": "A",
    "doctype": "text",
    "status": 1,
    "folder_name": "a.txt",
    "folder_parent_name": None,
    "tags": ["Tag A"],
    "word_frequencies": [("hello", 1), ("world", 1)],
    "metadata": [("language", "en")],
    "content": "Hello. World.",
    "html": "<p>Hello. World.</p>",
    "raw_html": "<p>Hello. World.</p>",
    "token_starts": [0, 7],
    "token_ends": [5, 12],
    "sentence_starts": [0, 7],
    "sentence_ends": [6, 13],
    "token_time_starts": None,
    "token_time_ends": None,
    "document_embedding": [0.1, 0.2],
    "image_embedding": None,
    "sentence_embeddings": [[0.1, 0.2], [0.3, 0.4]],
    "step_status": {},
}


# ===========================================================================
# SOURCE DOCUMENT EXPORT SCHEMA VALIDATION TESTS
# ===========================================================================


@pytest.mark.parametrize(
    "update",
    [
        # the reference document itself
        pytest.param({}, id="valid"),
        # documents without sentence embeddings
        pytest.param({"sentence_embeddings": []}, id="no-sentence-embeddings"),
        # fewer embeddings than sentences: the archive module of the sentence
        # embeddings says they are incomplete, the import leaves the step not
        # planned
        pytest.param(
            {"sentence_embeddings": [[0.1, 0.2]]}, id="incomplete-sentence-embeddings"
        ),
        # audio/video documents carry token times of the same length
        pytest.param(
            {"token_time_starts": [0, 500], "token_time_ends": [400, 900]},
            id="token-times",
        ),
    ],
)
def test_sdoc_export_schema_accepts_consistent_arrays(
    update: dict[str, Any],
) -> None:
    """Consistent array fields pass validation unchanged."""
    sdoc = SourceDocumentExportSchema(**{**VALID_SDOC, **update})

    assert sdoc.token_starts == VALID_SDOC["token_starts"]


@pytest.mark.parametrize(
    "update,message",
    [
        # one token end is missing
        pytest.param(
            {"token_ends": [5]},
            "token_starts and token_ends must have the same length",
            id="token-lengths",
        ),
        # one sentence end is missing
        pytest.param(
            {"sentence_ends": [6]},
            "sentence_starts and sentence_ends must have the same length",
            id="sentence-lengths",
        ),
        # the second sentence embedding has another dimension
        pytest.param(
            {"sentence_embeddings": [[0.1, 0.2], [0.3]]},
            "All sentence embeddings must have the same length",
            id="sentence-embedding-dimension",
        ),
        # token start times without end times
        pytest.param(
            {"token_time_starts": [0, 500]},
            "must either both be None or both be present",
            id="token-times-one-sided",
        ),
        # one token end time is missing
        pytest.param(
            {"token_time_starts": [0, 500], "token_time_ends": [400]},
            "token_time_starts and token_time_ends must have the same length",
            id="token-time-lengths",
        ),
    ],
)
def test_sdoc_export_schema_rejects_inconsistent_arrays(
    update: dict[str, Any], message: str
) -> None:
    """Related array fields of an exported document must fit together, so a
    broken export or import file is rejected instead of stored."""
    with pytest.raises(ValidationError, match=message):
        SourceDocumentExportSchema(**{**VALID_SDOC, **update})
