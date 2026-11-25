from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from dats_test_utils import stage_for_import
from modules.eximport.export_enum import ExportJobType
from modules.eximport.export_job_dto import ExportJobInput
from modules.eximport.export_service import ExportService
from modules.eximport.import_enum import ImportJobType
from modules.eximport.import_job_dto import ImportJobInput
from modules.eximport.import_service import ImportService
from provenance_test_utils import ProvenanceProject
from repos.filesystem.filesystem_repo import FilesystemRepo

# ===========================================================================
# EXPORT / IMPORT OF SENTENCE ANNOTATIONS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# handlers of the ALL_SENTENCE_ANNOTATIONS export job and the SENTENCE_ANNOTATIONS
# import job directly.


def _sentence_annotations(
    db: Session, project_id: int
) -> set[tuple[str, int, int, int, int, int]]:
    """The sentence annotations of a project as (uuid, user, document, code, first
    sentence, last sentence)."""
    db.expire_all()
    return {
        (
            annotation.uuid,
            annotation.annotation_document.user_id,
            annotation.annotation_document.source_document_id,
            annotation.code_id,
            annotation.sentence_id_start,
            annotation.sentence_id_end,
        )
        for annotation in crud_sentence_anno.read_by_project(
            db=db, project_id=project_id
        )
    }


def test_import_of_exported_sentence_annotations_restores_them_for_their_user(
    db_session: Session, provenance_project: ProvenanceProject
) -> None:
    """Exporting all sentence annotations of the project, deleting them and
    importing the exported CSV with the sentence annotation import restores the
    assistant's three annotations with their uuid, document, code and sentences."""
    project_id = provenance_project["project"].id
    sentence = provenance_project["sentence"]
    annotation_ids = [
        sentence["source_id"],
        sentence["source_plain_id"],
        sentence["other_sdoc_source_id"],
    ]
    exported = _sentence_annotations(db_session, project_id)
    assert {row[1] for row in exported} == {provenance_project["assistant"].id}
    assert {row[3] for row in exported} == {provenance_project["code_a"].id}
    assert len(exported) == 3

    output = ExportService().handle_export_job(
        db=db_session,
        export_id="test-export",
        payload=ExportJobInput(
            project_id=project_id,
            export_job_type=ExportJobType.ALL_SENTENCE_ANNOTATIONS,
            specific_export_job_parameters=None,
        ),
    )
    assert output.results_url is not None
    staged = stage_for_import(FilesystemRepo().root_dir / output.results_url)
    for annotation_id in annotation_ids:
        crud_sentence_anno.delete(
            db=db_session, project_id=project_id, id=annotation_id
        )
    db_session.commit()
    assert _sentence_annotations(db_session, project_id) == set()

    ImportService().handle_import_job(
        db=db_session,
        payload=ImportJobInput(
            project_id=project_id,
            import_job_type=ImportJobType.SENTENCE_ANNOTATIONS,
            user_id=provenance_project["user"].id,
            temporary_file_id=staged.parent.name,
            file_name=staged.name,
        ),
    )
    db_session.commit()

    assert _sentence_annotations(db_session, project_id) == exported
