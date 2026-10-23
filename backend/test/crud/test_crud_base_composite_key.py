"""Contract of SQLCRUDBase for composite primary keys (ids are key tuples)."""

from datetime import UTC, datetime

import pytest
from sqlalchemy.orm import Session

from modules.ml.ml_enum import MLJobStatus, MLJobTypeID
from modules.ml.source_document_job_status_crud import crud_sdoc_job_status
from modules.ml.source_document_job_status_dto import SourceDocumentJobStatusCreate
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from repos.db import crud_base
from repos.db.sql_exceptions import NoSuchElementError

from .conftest import SdocWithWordFrequencies


@pytest.fixture
def small_batches(monkeypatch: pytest.MonkeyPatch) -> None:
    """Split every batch method into several chunks of two ids."""
    monkeypatch.setattr(crud_base, "BATCH_SIZE", 2)


@pytest.mark.usefixtures("small_batches")
def test_read_by_ids_with_tuple_ids_returns_input_order(
    db_session: Session, sdoc_with_word_frequencies: SdocWithWordFrequencies
) -> None:
    sdoc_id = sdoc_with_word_frequencies["sdoc_id"]
    words = sdoc_with_word_frequencies["words"]
    ids = [(sdoc_id, words[i]) for i in [3, 0, 2, 1]]

    result = crud_word_frequency.read_by_ids(db=db_session, ids=ids)

    assert [(wf.sdoc_id, wf.word) for wf in result] == ids
    assert [wf.count for wf in result] == [4, 1, 3, 2]


def test_read_with_tuple_id_and_missing_key_names_all_key_columns(
    db_session: Session, sdoc_with_word_frequencies: SdocWithWordFrequencies
) -> None:
    sdoc_id = sdoc_with_word_frequencies["sdoc_id"]

    assert crud_word_frequency.read(db=db_session, id=(sdoc_id, "crud-beta")).count == 2
    with pytest.raises(NoSuchElementError) as error:
        crud_word_frequency.read(db=db_session, id=(sdoc_id, "crud-missing"))
    assert "sdoc_id" in str(error.value) and "crud-missing" in str(error.value)


@pytest.mark.usefixtures("small_batches")
def test_delete_multi_with_tuple_ids_deletes_only_those_keys(
    db_session: Session, sdoc_with_word_frequencies: SdocWithWordFrequencies
) -> None:
    sdoc_id = sdoc_with_word_frequencies["sdoc_id"]
    words = sdoc_with_word_frequencies["words"]

    deleted = crud_word_frequency.delete_multi(
        db=db_session,
        ids=[(sdoc_id, words[0]), (sdoc_id, words[2]), (sdoc_id, words[0])],
    )

    assert deleted == 2
    assert not crud_word_frequency.exists(db=db_session, id=(sdoc_id, words[0]))
    assert crud_word_frequency.exists(db=db_session, id=(sdoc_id, words[1]))
    assert crud_word_frequency.exists(db=db_session, id=(sdoc_id, words[3]))


def test_job_status_create_multi_replaces_only_the_same_job_type(
    db_session: Session, sdoc_with_word_frequencies: SdocWithWordFrequencies
) -> None:
    """(id, type) is the key: a new status replaces the row of its job type only."""
    sdoc_id = sdoc_with_word_frequencies["sdoc_id"]

    def status(
        job_type: MLJobTypeID, job_status: MLJobStatus
    ) -> SourceDocumentJobStatusCreate:
        return SourceDocumentJobStatusCreate(
            id=sdoc_id, type=job_type, status=job_status, timestamp=datetime.now(UTC)
        )

    crud_sdoc_job_status.create_multi(
        db=db_session,
        create_dtos=[
            status(MLJobTypeID.QUOTATION_ATTRIBUTION, MLJobStatus.WAITING),
            status(MLJobTypeID.DOCUMENT_EMBEDDING, MLJobStatus.WAITING),
        ],
    )
    crud_sdoc_job_status.create_multi(
        db=db_session,
        create_dtos=[status(MLJobTypeID.QUOTATION_ATTRIBUTION, MLJobStatus.FINISHED)],
    )

    result = crud_sdoc_job_status.read_by_ids(
        db=db_session,
        ids=[
            (sdoc_id, MLJobTypeID.QUOTATION_ATTRIBUTION),
            (sdoc_id, MLJobTypeID.DOCUMENT_EMBEDDING),
        ],
    )
    assert [r.status for r in result] == [MLJobStatus.FINISHED, MLJobStatus.WAITING]
