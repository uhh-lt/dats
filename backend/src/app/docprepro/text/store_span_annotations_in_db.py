from typing import List

from loguru import logger
from psycopg2 import OperationalError
from tqdm import tqdm

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.db.sql_service import SQLService
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status
from app.util.color import get_next_color

sql = SQLService()


def store_span_annotations_in_db_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    with sql.db_session() as db:
        for pptd in tqdm(pptds, desc="Persisting Automatic SpanAnnotations... "):
            # create AnnoDoc for system user
            # Flo: since we're sending the automatically generated caption from image docs as pptds it could be
            #  that there already is an adoc (with BBox Annos) for the system user and sdoc
            adoc_db = crud_adoc.read_by_sdoc_and_user(
                db=db, sdoc_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID, raise_error=False
            )
            if not adoc_db:
                adoc_create = AnnotationDocumentCreate(
                    source_document_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID
                )
                adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)

            # convert AutoSpans to SpanAnnotations
            for code in pptd.spans.keys():
                code_name = code
                # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
                if code_name == "PER":
                    code_name = "PERSON"
                db_code = crud_code.read_by_name_and_user_and_project(
                    db,
                    code_name=code_name,
                    user_id=SYSTEM_USER_ID,
                    proj_id=pptd.project_id,
                )
                if not db_code:
                    logger.warning(f"No Code <{code_name}> found! Creating ...")
                    # create code on the fly for system user
                    create_dto = CodeCreate(
                        name=code_name,
                        color=get_next_color(),
                        description=code_name,
                        project_id=pptd.project_id,
                        user_id=SYSTEM_USER_ID,
                    )
                    db_code = crud_code.create(db, create_dto=create_dto)

                ccid = db_code.current_code.id

                create_dtos = [
                    SpanAnnotationCreate(
                        begin=aspan.start,
                        end=aspan.end,
                        current_code_id=ccid,
                        annotation_document_id=adoc_db.id,
                        span_text=aspan.text,
                        begin_token=aspan.start_token,
                        end_token=aspan.end_token,
                    )
                    for aspan in pptd.spans[code]
                ]
                try:
                    crud_span_anno.create_multi(db, create_dtos=create_dtos)
                except OperationalError as e:
                    logger.error(
                        f"Cannot store SpanAnnotations of SourceDocument {adoc_db.source_document_id}: {e}"
                    )

            # Flo: update sdoc status
            update_sdoc_status(
                sdoc_id=pptd.sdoc_id,
                sdoc_status=SDocStatus.store_span_annotations_in_db,
            )

    return pptds
