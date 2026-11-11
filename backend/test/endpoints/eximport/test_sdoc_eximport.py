import zipfile
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.source_document_crud import crud_sdoc
from core.user.user_orm import UserORM
from modules.eximport.import_csv_utils import read_import_csv
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_exceptions import ImportSourceDocumentsError
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from modules.eximport.sdocs.export_sdocs import export_all_sdocs
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo

from .conftest import (
    SDOC_DOCUMENT_EMBEDDING,
    SDOC_SENTENCE_EMBEDDINGS,
    SdocEximportProjects,
)

# ===========================================================================
# EXPORT / IMPORT OF DOCUMENTS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export function and the import job handler (DOCUMENTS) directly.

# The cells of the documents CSV that hold the Python representation of a list (or,
# for the step statuses, of a dict)
LIST_FIELDS = [
    "tags",
    "token_starts",
    "token_ends",
    "sentence_starts",
    "sentence_ends",
    "document_embedding",
    "sentence_embeddings",
    "image_embedding",
    "token_time_starts",
    "token_time_ends",
    "word_frequencies",
    "metadata",
    "step_status",
]


def _import_documents(
    db: Session, archive: Path, project_id: int, user_id: int
) -> None:
    """Run the documents import job on an archive in the temporary files."""
    ImportService().handle_import_job(
        db=db,
        payload=ImportJobInput(
            project_id=project_id,
            import_job_type=ImportJobType.DOCUMENTS,
            user_id=user_id,
            file_name=archive.name,
        ),
    )


def _replace_cell(archive: Path, field: str, value: str) -> Path:
    """Copy a documents archive, with `value` as the cell `field` of its first document."""
    crafted_archive = archive.with_name(f"crafted_{archive.name}")
    with (
        zipfile.ZipFile(archive) as source,
        zipfile.ZipFile(crafted_archive, "w") as target,
    ):
        for entry in source.infolist():
            if not entry.filename.endswith(".csv"):
                target.writestr(entry, source.read(entry))
                continue
            df = read_import_csv(
                source.extract(entry, archive.with_name(f"crafted_{archive.stem}"))
            )
            df[field] = df[field].astype(object)
            df.loc[0, field] = value
            target.writestr(entry, df.to_csv(index=False))
    return crafted_archive


# --- A. round trip ---------------------------------------------------------------------


def test_document_survives_export_import_round_trip(
    db_session: Session,
    sdoc_eximport_projects: SdocEximportProjects,
    test_user: UserORM,
) -> None:
    """Exporting the document "report.txt" and importing the archive into another
    project restores its content, offsets, tag, word frequencies, metadata and
    embeddings. Weaviate returns the sentence embeddings in no fixed order, so they
    are compared sorted."""
    project = sdoc_eximport_projects["project"]
    target_project = sdoc_eximport_projects["target_project"]
    sdoc = sdoc_eximport_projects["sdoc"]

    archive = export_all_sdocs(
        db=db_session, fsr=FilesystemRepo(), project_id=project.id
    )
    _import_documents(db_session, archive, target_project.id, test_user.id)
    db_session.commit()

    imported = crud_sdoc.read_by_filename(
        db=db_session,
        project_id=target_project.id,
        filename="report.txt",
        only_finished=False,
    )
    assert imported is not None
    assert imported.name == sdoc.name
    assert imported.doctype == sdoc.doctype
    for column in [
        "content",
        "html",
        "raw_html",
        "token_starts",
        "token_ends",
        "sentence_starts",
        "sentence_ends",
        "token_time_starts",
        "token_time_ends",
    ]:
        assert getattr(imported.data, column) == getattr(sdoc.data, column), column
    assert imported.data.sentence_starts == [0, 18]
    assert [tag.name for tag in imported.tags] == ["Important"]
    assert sorted((wf.word, wf.count) for wf in imported.word_frequencies) == [
        ("alpha", 2),
        ("beta", 1),
    ]

    def metadata_values(document) -> dict:
        return {
            metadata.project_metadata.key: (
                metadata.str_value,
                metadata.int_value,
                metadata.boolean_value,
                metadata.date_value,
                metadata.list_value,
            )
            for metadata in document.metadata_
        }

    assert metadata_values(imported) == metadata_values(sdoc)
    assert metadata_values(imported)["language"][0] == "en"

    client = WeaviateRepo().get_client()
    assert (
        crud_document_embedding.read(
            client=client,
            project_id=target_project.id,
            id=DocumentObjectIdentifier(sdoc_id=imported.id),
        )
        == SDOC_DOCUMENT_EMBEDDING
    )
    sentence_embeddings = crud_sentence_embedding.read_by_sdoc_id(
        client=client, project_id=target_project.id, sdoc_id=imported.id
    )
    assert sorted(se.embedding for se in sentence_embeddings) == sorted(
        SDOC_SENTENCE_EMBEDDINGS
    )


# --- B. crafted archives ---------------------------------------------------------------
# The list cells are parsed as Python literals. Anything else (a call, an operator, a
# name) is never evaluated: the cell stays a string and fails the schema validation.


@pytest.mark.parametrize("field", LIST_FIELDS)
def test_document_import_rejects_expression_without_executing_it(
    db_session: Session,
    sdoc_eximport_projects: SdocEximportProjects,
    test_user: UserORM,
    tmp_path: Path,
    field: str,
) -> None:
    """An archive whose list cell is an expression with a side effect (it writes a
    file) is rejected as invalid data: the file is not written and no document is
    imported."""
    project = sdoc_eximport_projects["project"]
    target_project = sdoc_eximport_projects["target_project"]
    marker = tmp_path / "executed"
    archive = _replace_cell(
        export_all_sdocs(db=db_session, fsr=FilesystemRepo(), project_id=project.id),
        field,
        f"[__import__('pathlib').Path({str(marker)!r}).write_text('x')]",
    )

    with pytest.raises(ImportSourceDocumentsError, match="Invalid data format"):
        _import_documents(db_session, archive, target_project.id, test_user.id)

    assert not marker.exists()
    assert (
        crud_sdoc.read_by_project(
            db=db_session, project_id=target_project.id, only_finished=False
        )
        == []
    )


@pytest.mark.parametrize(
    "cell",
    [
        # An operator on literals is an expression, not a literal
        pytest.param("[1] * 3", id="operator"),
        # A builtin call without side effects is still a call
        pytest.param("list(range(3))", id="call"),
        # A literal of the wrong type is parsed, but fails the schema
        pytest.param("{'a': 1}", id="wrong-literal"),
        # Text that is no Python at all
        pytest.param("not a list", id="no-python"),
    ],
)
def test_document_import_rejects_cells_that_are_no_list_literal(
    db_session: Session,
    sdoc_eximport_projects: SdocEximportProjects,
    test_user: UserORM,
    cell: str,
) -> None:
    """An archive whose "token_starts" cell is not the literal of a list of ints is
    rejected as invalid data and no document is imported."""
    project = sdoc_eximport_projects["project"]
    target_project = sdoc_eximport_projects["target_project"]
    archive = _replace_cell(
        export_all_sdocs(db=db_session, fsr=FilesystemRepo(), project_id=project.id),
        "token_starts",
        cell,
    )

    with pytest.raises(ImportSourceDocumentsError, match="Invalid data format"):
        _import_documents(db_session, archive, target_project.id, test_user.id)

    assert (
        crud_sdoc.read_by_project(
            db=db_session, project_id=target_project.id, only_finished=False
        )
        == []
    )
