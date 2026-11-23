import sqlalchemy as sa
from alembic import command
from sqlalchemy.orm import Session

from .conftest import (
    FILE_STORE,
    TRANSCRIPT_WORDS,
    OldTranscriptDocuments,
    alembic_config,
)

_NEW = (
    "transcript_word_starts, transcript_word_ends, "
    "transcript_word_time_starts, transcript_word_time_ends"
)


def _row(db: Session, columns: str, sdoc_id: int) -> tuple:
    """Some columns of the data row of the document."""
    row = db.execute(
        sa.text(f"SELECT {columns} FROM sourcedocumentdata WHERE id = :id"),
        {"id": sdoc_id},
    ).one()
    db.commit()
    return tuple(row)


# ===========================================================================
# THE TRANSCRIPT OWNS ITS WORDS (fd0c18fab079) TESTS
# ===========================================================================


def test_upgrade_gives_audio_and_video_their_transcript_words(
    db_session: Session, old_transcript_database: OldTranscriptDocuments
):
    """The words of the transcript of an audio or video are its tokens, with
    the token times; a text document has no transcript."""
    command.upgrade(alembic_config(), TRANSCRIPT_WORDS)

    for sdoc_id in (
        old_transcript_database["audio_id"],
        old_transcript_database["video_id"],
    ):
        assert _row(db_session, _NEW, sdoc_id) == (
            [0, 6],
            [5, 12],
            [0, 500],
            [400, 900],
        )
    assert _row(db_session, _NEW, old_transcript_database["text_id"]) == (
        None,
        None,
        None,
        None,
    )


def test_downgrade_restores_the_token_times(
    db_session: Session, old_transcript_database: OldTranscriptDocuments
):
    """The downgrade renames the word times back to the token times."""
    config = alembic_config()
    command.upgrade(config, TRANSCRIPT_WORDS)
    command.downgrade(config, FILE_STORE)

    assert _row(
        db_session,
        "token_time_starts, token_time_ends",
        old_transcript_database["audio_id"],
    ) == ([0, 500], [400, 900])
    assert _row(
        db_session,
        "token_time_starts, token_time_ends",
        old_transcript_database["text_id"],
    ) == (None, None)
