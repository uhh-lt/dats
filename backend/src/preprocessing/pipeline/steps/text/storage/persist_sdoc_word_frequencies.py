import traceback

from loguru import logger
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from repos.db.sql_repo import SQLRepo

sql: SQLRepo = SQLRepo()


def persist_sdoc_word_frequencies(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    logger.info(f"Persisting SourceDocument Word Frequencies for {pptd.filename}...")
    with sql.db_session() as db:
        try:
            sdoc_id = cargo.data["sdoc_id"]
            word_freqs = pptd.word_freqs

            wfs_create_dtos = []
            for word, count in word_freqs.items():
                wfs_create_dtos.append(
                    WordFrequencyCreate(
                        sdoc_id=sdoc_id,
                        word=word,
                        count=count,
                    )
                )
            crud_word_frequency.create_multi(db=db, create_dtos=wfs_create_dtos)
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
