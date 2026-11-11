import os
import wave
from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM


class AudioProject(TypedDict):
    """This fixture sets up the following project:

    - Project "Simple Test Project" of the test user (see `test_project`).
    - One audio document "Test Audio" (`silence.wav`): one second of silence
      (16 kHz, mono, 16 bit PCM), stored in the project's filesystem directory.
      The document is in the state right after its upload: its document data
      exists but is empty (no content, no tokens, no token timings), so the
      transcription is the step that fills it.

    Non-obvious derived behavior:

    - The file contains no speech, so tests of the transcription step replace
      the Whisper call (`RayRepo.whisper_transcribe`) and assert on its output.
    """

    project: ProjectORM
    audio_document: SourceDocumentORM
    audio_filepath: str


@pytest.fixture(scope="function")
def audio_project(db_session: Session, test_project: ProjectORM) -> AudioProject:
    from core.doc.source_document_crud import crud_sdoc
    from core.doc.source_document_data_crud import crud_sdoc_data
    from core.doc.source_document_data_dto import SourceDocumentDataCreate
    from core.doc.source_document_dto import SourceDocumentCreate
    from repos.filesystem_repo import FilesystemRepo

    fsr = FilesystemRepo()
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="silence.wav",
            name="Test Audio",
            doctype=DocType.audio,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    file_path = fsr._get_dst_path_for_project_sdoc_file(
        project_id=test_project.id, filename=sdoc.filename
    )
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(file_path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(b"\x00\x00" * 16000)

    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="",
            repo_url=os.path.relpath(file_path, fsr.root_dir),
            raw_html="",
            html="",
            token_starts=[],
            token_ends=[],
            sentence_starts=[],
            sentence_ends=[],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )

    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(sdoc)

    return {
        "project": test_project,
        "audio_document": sdoc,
        "audio_filepath": str(file_path),
    }
