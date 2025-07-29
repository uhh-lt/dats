import shutil

import srsly
from common.doc_type import DocType
from common.meta_type import MetaType
from common.singleton_meta import SingletonMeta
from core.celery.background_jobs import start_cota_refinement_job_async
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from fastapi.encoders import jsonable_encoder
from loguru import logger
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTACreateIntern,
    COTARead,
    COTARefinementHyperparameters,
    COTARefinementJobCreate,
    COTARefinementJobRead,
    COTASentence,
    COTASentenceID,
    COTATimelineSettings,
    COTAUpdate,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.pipeline import (
    build_cota_refinement_pipeline,
)
from modules.simsearch.simsearch_service import SimSearchService
from modules.trainer.trainer_service import TrainerService
from repos.db.sql_repo import SQLRepo
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.redis_repo import RedisRepo
from sqlalchemy.orm import Session
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class COTAService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.trainer: TrainerService = TrainerService()
        cls.sims: SimSearchService = SimSearchService()
        cls.es: ElasticSearchRepo = ElasticSearchRepo()
        cls.redis: RedisRepo = RedisRepo()
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.sqlr: SQLRepo = SQLRepo()

        cls.max_search_space_per_concept: int = 1000
        cls.search_space_sim_search_threshold: float = 0.5

        return super(COTAService, cls).__new__(cls)

    def create(self, db: Session, cota_create: COTACreateIntern) -> COTARead:
        db_obj = crud_cota.create(db=db, create_dto=cota_create)

        # initialize the date metadata if possible
        project_metadata = [
            ProjectMetadataRead.model_validate(pm)
            for pm in crud_project_meta.read_by_project(
                db=db, proj_id=cota_create.project_id
            )
        ]
        project_metadata = [
            pm
            for pm in project_metadata
            if pm.metatype == MetaType.DATE and pm.doctype == DocType.text
        ]
        if len(project_metadata) > 0:
            db_obj = self.update(
                db=db,
                cota_id=db_obj.id,
                cota_update=COTAUpdate(
                    timeline_settings=COTATimelineSettings(
                        date_metadata_id=project_metadata[0].id
                    )
                ),
            )

        return COTARead.model_validate(db_obj)

    def read_by_id(self, *, db: Session, cota_id: int) -> COTARead:
        db_obj = crud_cota.read(db=db, id=cota_id)
        return COTARead.model_validate(db_obj)

    def read_by_project(
        self,
        *,
        db: Session,
        project_id: int,
    ) -> list[COTARead]:
        db_objs = crud_cota.read_by_project(db=db, project_id=project_id)
        return [COTARead.model_validate(db_obj) for db_obj in db_objs]

    def update(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_update: COTAUpdate,
    ) -> COTARead:
        # make sure that cota with cota_id exists
        self.read_by_id(db=db, cota_id=cota_id)

        update_dto_as_in_db = COTAUpdateIntern(
            **cota_update.model_dump(
                exclude={
                    "concepts",
                    "training_settings",
                    "timeline_settings",
                },
                exclude_none=True,
            ),
        )

        if cota_update.concepts is not None:
            concepts_str = srsly.json_dumps(jsonable_encoder(cota_update.concepts))
            update_dto_as_in_db.concepts = concepts_str

        if cota_update.training_settings is not None:
            training_settings_str = srsly.json_dumps(
                jsonable_encoder(cota_update.training_settings)
            )
            update_dto_as_in_db.training_settings = training_settings_str

        if cota_update.timeline_settings is not None:
            timeline_settings_str = srsly.json_dumps(
                jsonable_encoder(cota_update.timeline_settings)
            )
            update_dto_as_in_db.timeline_settings = timeline_settings_str

        # update the cota in db
        db_obj = crud_cota.update(db=db, id=cota_id, update_dto=update_dto_as_in_db)

        # return the results
        return COTARead.model_validate(db_obj)

    def reset(
        self,
        *,
        db: Session,
        cota_id: int,
    ) -> COTARead:
        # make sure that cota with cota_id exists
        cota = self.read_by_id(db=db, cota_id=cota_id)
        # delete the model directories
        model_dir = self.fsr.get_model_dir(cota.project_id, str(cota.id))
        if model_dir.exists():
            shutil.rmtree(model_dir)
        best_model_dir = self.fsr.get_model_dir(
            cota.project_id, str(cota.id) + "-best-model"
        )
        if best_model_dir.exists():
            shutil.rmtree(best_model_dir)
        # delete the refinement jobs
        self.redis.delete_all_cota_job_by_cota_id(cota_id=cota.id)
        # reset the search space
        update_dto_as_in_db = COTAUpdateIntern(
            search_space=srsly.json_dumps(jsonable_encoder([]))
        )
        # update the cota in db
        db_obj = crud_cota.update(db=db, id=cota_id, update_dto=update_dto_as_in_db)
        # return the results
        return COTARead.model_validate(db_obj)

    def delete_by_id(self, *, db: Session, cota_id: int) -> COTARead:
        db_obj = crud_cota.delete(db=db, id=cota_id)
        return COTARead.model_validate(db_obj)

    def create_and_start_refinement_job_async(
        self,
        *,
        db: Session,
        cota_id: int,
        hyperparams: COTARefinementHyperparameters | None,
    ) -> COTARefinementJobRead:
        # make sure the cota exists!
        cota = self.read_by_id(db=db, cota_id=cota_id)

        # make sure there is at least one concept
        if len(cota.concepts) < 2:
            raise ValueError("At least two concepts are required for refinement!")

        if hyperparams is None:
            hyperparams = COTARefinementHyperparameters()
        create_dto = COTARefinementJobCreate(cota=cota, hyperparams=hyperparams)

        job = self.redis.store_cota_job(create_dto)
        logger.info(f"Created and prepared COTA Refinement job ID: {job.id}")

        start_cota_refinement_job_async(cota_job_id=job.id)  # FIXME

        return job

    def _start_refinement_job_sync(
        self,
        *,
        job_id: str,
    ) -> COTARefinementJobRead:
        # THIS IS EXECUTED IN THE BACKGROUND JOBS WORKER
        pipeline = build_cota_refinement_pipeline()

        job: COTARefinementJobRead = self.redis.load_cota_job(job_id)
        logger.info(
            f"Starting COTA Refinement job ID: {job.id} for COTA ID: {job.cota.id}"
        )

        job.status = BackgroundJobStatus.RUNNING
        job = self.redis.store_cota_job(job)
        try:
            job = pipeline.execute(job)
        except Exception as e:
            logger.error(f"Error while executing COTA Refinement job: {job}")
            job.status = BackgroundJobStatus.ERROR
            job = self.redis.store_cota_job(job)
            raise e

        return job

    def annotate_sentences(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_sentence_ids: list[COTASentenceID],
        concept_id: str | None = None,
    ) -> COTARead:  # noqa: F821
        cota = self.read_by_id(db=db, cota_id=cota_id)

        # create map
        cota_sentence_id2_cota_sentence: dict[str, COTASentence] = dict()
        for cota_sentence in cota.search_space:
            cota_sentence_id2_cota_sentence[
                f"{cota_sentence.sdoc_id}_{cota_sentence.sentence_id}"
            ] = cota_sentence

        # find the cota sentences and annotate them
        for cota_sentence_id in cota_sentence_ids:
            idx = f"{cota_sentence_id.sdoc_id}_{cota_sentence_id.sentence_id}"
            cota_sentence_id2_cota_sentence[idx].concept_annotation = concept_id

        # json dump the search space
        search_space_str = srsly.json_dumps(
            jsonable_encoder(list(cota_sentence_id2_cota_sentence.values()))
        )

        # update the cota in db
        db_obj = crud_cota.update(
            db=db,
            id=cota_id,
            update_dto=COTAUpdateIntern(
                search_space=search_space_str,
            ),
        )

        # return the results
        return COTARead.model_validate(db_obj)

    def remove_sentences(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_sentence_ids: list[COTASentenceID],
    ) -> COTARead:  # noqa: F821
        cota = self.read_by_id(db=db, cota_id=cota_id)

        # create map
        cota_sentence_id2_cota_sentence: dict[str, COTASentence] = dict()
        for cota_sentence in cota.search_space:
            cota_sentence_id2_cota_sentence[
                f"{cota_sentence.sdoc_id}_{cota_sentence.sentence_id}"
            ] = cota_sentence

        # find the cota sentences and delete them
        for cota_sentence_id in cota_sentence_ids:
            idx = f"{cota_sentence_id.sdoc_id}_{cota_sentence_id.sentence_id}"
            del cota_sentence_id2_cota_sentence[idx]

        # json dump the search space
        search_space_str = srsly.json_dumps(
            jsonable_encoder(list(cota_sentence_id2_cota_sentence.values()))
        )

        # update the cota in db
        db_obj = crud_cota.update(
            db=db,
            id=cota_id,
            update_dto=COTAUpdateIntern(
                search_space=search_space_str,
            ),
        )

        # return the results
        return COTARead.model_validate(db_obj)
