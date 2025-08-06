import shutil

import srsly
from common.doc_type import DocType
from common.meta_type import MetaType
from common.singleton_meta import SingletonMeta
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from fastapi.encoders import jsonable_encoder
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.concept_over_time_analysis.cota_dto import (
    COTACreateIntern,
    COTARead,
    COTARefinementJobInput,
    COTASentence,
    COTASentenceID,
    COTATimelineSettings,
    COTAUpdate,
    COTAUpdateIntern,
)
from modules.concept_over_time_analysis.cota_orm import ConceptOverTimeAnalysisORM
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from sqlalchemy.orm import Session
from systems.job_system.job_service import JobService


class COTAService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.sqlr: SQLRepo = SQLRepo()
        cls.js = JobService()
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

    def update(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_update: COTAUpdate,
    ) -> COTARead:
        # make sure that cota with cota_id exists
        crud_cota.read(db=db, id=cota_id)

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
        db_obj = crud_cota.read(db=db, id=cota_id)
        cota = COTARead.model_validate(db_obj)
        # delete the model directories
        model_dir = self.fsr.get_model_dir(cota.project_id, str(cota.id))
        if model_dir.exists():
            shutil.rmtree(model_dir)
        best_model_dir = self.fsr.get_model_dir(
            cota.project_id, str(cota.id) + "-best-model"
        )
        if best_model_dir.exists():
            shutil.rmtree(best_model_dir)
        # reset the search space & refinement job
        db_obj = crud_cota.update(
            db=db,
            id=cota_id,
            update_dto=COTAUpdateIntern(
                search_space=srsly.json_dumps(jsonable_encoder([])),
                last_refinement_job_id=None,
            ),
        )
        # return the results
        return COTARead.model_validate(db_obj)

    def annotate_sentences(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_sentence_ids: list[COTASentenceID],
        concept_id: str | None = None,
    ) -> COTARead:  # noqa: F821
        db_obj = crud_cota.read(db=db, id=cota_id)
        cota = COTARead.model_validate(db_obj)

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
    ) -> COTARead:
        db_obj = crud_cota.read(db=db, id=cota_id)
        cota = COTARead.model_validate(db_obj)

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

    def start_refinement_job(
        self,
        *,
        db: Session,
        payload: COTARefinementJobInput,
    ) -> ConceptOverTimeAnalysisORM:
        # make sure the cota exists
        crud_cota.read(db=db, id=payload.cota_id)

        # start the refinement job
        job = self.js.start_job(
            job_type="cota_refinement",
            payload=payload,
        )

        # update last refinement job id
        return crud_cota.update(
            db=db,
            id=payload.cota_id,
            update_dto=COTAUpdateIntern(
                last_refinement_job_id=job.id,
            ),
        )
