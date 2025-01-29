import traceback
from typing import Dict, Set

from loguru import logger
from psycopg2 import OperationalError

from app.core.data.crud.code import crud_code
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.dto.code import CodeCreate
from app.core.data.dto.sentence_annotation import SentenceAnnotationCreate
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.autosentanno import AutoSentAnno
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.util.color import get_next_color

sql: SQLService = SQLService()


def persist_sentence_annotations(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    logger.info(f"Persisting SentenceAnnotations for {pptd.filename}...")
    with sql.db_session() as db:
        try:
            sdoc_id = cargo.data["sdoc_id"]
            # convert AutoSentAnnos to SentenceAnnotations
            for code_name in pptd.sent_annos.keys():
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
                grouped_by_user_sent_annos: Dict[int, Set[AutoSentAnno]] = dict()
                for sent_anno in pptd.sent_annos[code_name]:
                    if sent_anno.user_id not in grouped_by_user_sent_annos:
                        grouped_by_user_sent_annos[sent_anno.user_id] = set()
                    grouped_by_user_sent_annos[sent_anno.user_id].add(sent_anno)

                # for every user and for every code create bulk dtos.
                for user_id, sent_annos in grouped_by_user_sent_annos.items():
                    create_dtos = [
                        SentenceAnnotationCreate(
                            sentence_id_start=sent_anno.start,
                            sentence_id_end=sent_anno.end,
                            code_id=db_code.id,
                            sdoc_id=sdoc_id,
                        )
                        for sent_anno in sent_annos
                    ]
                    try:
                        crud_sentence_anno.create_bulk(
                            db, user_id=user_id, create_dtos=create_dtos
                        )
                    except OperationalError as e:
                        logger.error(
                            f"Cannot store SentenceAnnotations of SourceDocument {sdoc_id}: {e}"
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
