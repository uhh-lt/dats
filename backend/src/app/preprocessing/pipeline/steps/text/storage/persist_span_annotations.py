import traceback
from typing import Dict, Set

from loguru import logger
from psycopg2 import OperationalError

from app.core.data.crud.code import crud_code
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autospan import AutoSpan
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.util.color import get_next_color

sql: SQLService = SQLService()


def persist_span_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    logger.info(f"Persisting SpanAnnotations for {pptd.filename}...")
    with sql.db_session() as db:
        try:
            sdoc_id = cargo.data["sdoc_id"]
            # convert AutoSpans to SpanAnnotations
            for code_name in pptd.spans.keys():
                db_code = crud_code.read_by_name_and_project(
                    db,
                    code_name=code_name,
                    proj_id=pptd.project_id,
                )
                if not db_code:
                    logger.warning(
                        f"No Code <{code_name}> found! Creating it on the fly..."
                    )
                    # create code on the fly for system user
                    create_dto = CodeCreate(
                        name=code_name,
                        color=get_next_color(),
                        description=code_name,
                        project_id=pptd.project_id,
                        is_system=True,
                    )
                    db_code = crud_code.create(db, create_dto=create_dto)

                # group by user
                grouped_by_user_spans: Dict[int, Set[AutoSpan]] = dict()
                for aspan in pptd.spans[code_name]:
                    if aspan.user_id not in grouped_by_user_spans:
                        grouped_by_user_spans[aspan.user_id] = set()
                    grouped_by_user_spans[aspan.user_id].add(aspan)

                # for every user and for every code create bulk dtos.
                for user_id, aspans in grouped_by_user_spans.items():
                    create_dtos = [
                        SpanAnnotationCreate(
                            begin=aspan.start,
                            end=aspan.end,
                            code_id=db_code.id,
                            span_text=aspan.text,
                            begin_token=aspan.start_token,
                            end_token=aspan.end_token,
                            sdoc_id=sdoc_id,
                        )
                        for aspan in aspans
                    ]
                    try:
                        crud_span_anno.create_bulk(
                            db, user_id=user_id, create_dtos=create_dtos
                        )
                    except OperationalError as e:
                        logger.error(
                            f"Cannot store SpanAnnotations of SourceDocument {sdoc_id}: {e}"
                        )
                        raise e
        except Exception as e:
            logger.error(
                f"Error while persisting PreprocessingPipeline Results "
                f"for {pptd.filename}"
            )
            traceback.print_exception(e)
            # FIXME: this is not working because we commmit the sessions in the cruds!
            # To fix it, we have to use flush instead of commit in the cruds and commit
            #  via the context manager, i.e., session autocommit...
            # But this would require huge changes!
            db.rollback()
            raise e
    return cargo
