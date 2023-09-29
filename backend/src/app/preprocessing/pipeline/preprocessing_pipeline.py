import os
import time
from functools import partial, reduce
from typing import Callable, Dict, List, Optional

from app.core.data.crud.preprocessing_job import crud_prepro_job
from app.core.data.crud.preprocessing_job_payload import crud_prepro_job_payload
from app.core.data.doc_type import DocType
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobRead,
    PreprocessingJobUpdate,
)
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadRead,
    PreprocessingJobPayloadUpdate,
)
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.pipeline_step import PipelineStep
from loguru import logger
from multiprocess.pool import Pool
from tqdm import tqdm


class PreprocessingPipeline:
    def __init__(
        self,
        doc_type: DocType,
        num_workers: int = 1,
        force_sequential: bool = True,
    ):
        self._dt = doc_type
        self._steps_by_ordering: Dict[int, PipelineStep] = dict()
        self._steps_by_name: Dict[str, PipelineStep] = dict()
        self.sqls: SQLService = SQLService()

        self.num_workers = num_workers
        self.force_sequential = force_sequential

        self.__is_frozen = False

        # this is a helper cache to avoid loading the same ppj multiple times
        self.__ppj_cache: Dict[str, PreprocessingJobRead] = dict()

    def _register_pipeline_step(self, step: PipelineStep) -> None:
        if step.ordering < 1:
            raise ValueError(
                f"Cannot add step {step.name}! "
                f"Due to ivalid step ordering {step.ordering}!"
                "Task orderings must be positive integers!"
            )
        elif step.ordering in self._steps_by_ordering:
            raise KeyError(
                f"Cannot add step {step.name} to PreprocessingPipeline({self._dt})!"
                f"There is already a step {self.get_step_by_ordering(step.ordering)}"
                f" with the same ordering: {step.ordering}!"
            )
        elif step.name in self._steps_by_name:
            raise KeyError(
                f"There is already a step with the same name: {step.name}"
                f" in PreprocessingPipeline({self._dt})!"
            )

        self._steps_by_ordering[step.ordering] = step
        self._steps_by_name[step.name] = step

        logger.info(
            f"Registered PipelineStep {step} in PreprocessingPipeline({self._dt})"
        )

    def get_step_by_name(self, name: str) -> PipelineStep:
        return self._steps_by_name[name]

    def get_step_by_ordering(self, ordering: int) -> PipelineStep:
        return self._steps_by_ordering[ordering]

    def __execute_in_parallel(self, cargos: List[PipelineCargo]) -> List[PipelineCargo]:
        logger.info(
            f"Executing PreprocessingPipeline({self._dt}) "
            f"parallely for {len(cargos)} cargo(s)!"
        )

        def chain(*step_funcs):
            def chained_call(arg):
                return reduce(
                    lambda cargo, step_func: step_func(cargo), step_funcs, arg
                )

            return chained_call

        pipeline = chain(
            *[
                partial(self._run_step, step=self.get_step_by_ordering(ordering))
                for ordering in sorted(self._steps_by_ordering.keys())
            ]
        )

        pool = Pool(processes=self.num_workers)
        cargos = list(pool.map(pipeline, cargos))

        # wait for all tasks to complete
        pool.close()
        pool.join()

        cargos = [
            self._update_ppj_payload_of_cargo(cargo=cargo, current_step_name="None")
            for cargo in cargos
        ]

        cargos = [
            self._update_ppj_payload_of_cargo(
                cargo=cargo, status=BackgroundJobStatus.FINISHED
            )
            for cargo in cargos
        ]

        return cargos

    def __execute_sequentially(
        self, cargos: List[PipelineCargo]
    ) -> List[PipelineCargo]:
        logger.info(
            f"Executing PreprocessingPipeline({self._dt}) sequentially"
            f" for {len(cargos)} cargo(s)!"
        )
        for cargo in tqdm(cargos, desc="Processing PipelineCargos ..."):
            for ordering in sorted(self._steps_by_ordering.keys()):
                cargo = self._run_step(
                    cargo=cargo, step=self.get_step_by_ordering(ordering)
                )
                if (
                    cargo.ppj_payload.status == BackgroundJobStatus.ABORTED
                    or cargo.ppj_payload.status == BackgroundJobStatus.ERROR
                ):
                    break

            if cargo.ppj_payload.status == BackgroundJobStatus.RUNNING:
                cargo = self._update_ppj_payload_of_cargo(
                    cargo=cargo,
                    current_step_name="None",
                    status=BackgroundJobStatus.FINISHED,
                )
        return cargos

    def execute(
        self, cargos: List[PipelineCargo], force_sequential: Optional[bool] = None
    ) -> List[PipelineCargo]:
        if not self.__is_frozen:
            raise ValueError(
                f"Cannot execute PreprocessingPipeline({self._dt})"
                " since it has not been frozen yet!"
            )
        # reset ppj cache
        self.__ppj_cache = dict()

        # initialize the cargos
        cargos = self._set_next_steps_of_all_cargos(cargos=cargos)

        # update the status of the preprocessing jobs to inprogress
        cargos = self._update_status_for_all_ppjs(
            cargos=cargos, status=BackgroundJobStatus.RUNNING
        )

        if force_sequential is None:
            force_sequential = self.force_sequential
        start_t = time.perf_counter()
        if (
            not force_sequential
            and self.num_workers > 1
            and len(cargos) >= self.num_workers
        ):
            cargos = self.__execute_in_parallel(cargos=cargos)
        else:
            cargos = self.__execute_sequentially(cargos=cargos)
        stop_t = time.perf_counter()

        # update the status of the preprocessing jobs to done
        cargos = self._update_status_for_all_ppjs(
            cargos=cargos, status=BackgroundJobStatus.FINISHED
        )

        logger.info(
            f"Executing the PreprocessingPipeline({self._dt}) took"
            f" {stop_t - start_t:0.4f} seconds"
        )
        return cargos

    def _update_status_for_all_ppjs(
        self, cargos: List[PipelineCargo], status: BackgroundJobStatus
    ) -> List[PipelineCargo]:
        # update the status of all ppjs
        ppj_ids = set(map(lambda c: c.ppj_payload.prepro_job_id, cargos))
        update_dto = PreprocessingJobUpdate(status=status)
        for ppj_id in ppj_ids:
            logger.info(
                f"Updating PreprocessingJob {ppj_id} Status to {status.value}..."
            )
            with self.sqls.db_session() as db:
                _ = crud_prepro_job.update(db=db, uuid=ppj_id, update_dto=update_dto)
        return cargos

    def _set_next_steps_of_all_cargos(
        self, cargos: List[PipelineCargo]
    ) -> List[PipelineCargo]:
        for cargo in tqdm(cargos, desc="Setting next PipelineSteps..."):
            # set the next steps
            cargo.next_steps = list(
                map(
                    lambda i: i[1],
                    sorted(self._steps_by_ordering.items(), key=lambda i: i[0]),
                )
            )
        return cargos

    def _load_ppj_of_cargo(
        self,
        cargo: PipelineCargo,
    ) -> PreprocessingJobRead:
        with self.sqls.db_session() as db:
            db_obj = crud_prepro_job.read(db=db, uuid=cargo.ppj_payload.prepro_job_id)
            ppj = PreprocessingJobRead.from_orm(db_obj)
        return ppj

    def _run_step(self, cargo: PipelineCargo, step: PipelineStep) -> PipelineCargo:
        ppj = self._load_ppj_of_cargo(cargo=cargo)
        if (
            cargo.ppj_payload.status == BackgroundJobStatus.ABORTED
            or ppj.status == BackgroundJobStatus.ABORTED
        ):
            logger.warning(
                (
                    f"Skipping the PreprocessingPipeline({self._dt}) "
                    f"for PreprocessingJobPayload {cargo.ppj_payload.filename} "
                    f"since it has been aborted by a user!"
                )
            )
            cargo = self._update_ppj_payload_of_cargo(
                cargo=cargo,
                status=BackgroundJobStatus.ABORTED,
            )
            return cargo
        elif (
            cargo.ppj_payload.status == BackgroundJobStatus.FINISHED
            or ppj.status == BackgroundJobStatus.FINISHED
        ):
            logger.warning(
                (
                    f"Skipping the PreprocessingPipeline({self._dt}) "
                    f"for PreprocessingJobPayload {cargo.ppj_payload.filename} "
                    f"since it has been finished already!"
                )
            )
            return cargo
        elif (
            cargo.ppj_payload.status == BackgroundJobStatus.ERROR
            or ppj.status == BackgroundJobStatus.ERROR
        ):
            logger.warning(
                (
                    f"Skipping the PreprocessingPipeline({self._dt}) "
                    f"for PreprocessingJobPayload {cargo.ppj_payload.filename} "
                    f"since it has an error!"
                )
            )
            return cargo

        try:
            if cargo.ppj_payload.status == BackgroundJobStatus.WAITING:
                cargo = self._update_ppj_payload_of_cargo(
                    cargo=cargo, status=BackgroundJobStatus.RUNNING
                )
            if step in cargo.finished_steps:
                logger.warning(
                    (
                        f"[Pipeline Worker {os.getpid()}] Skipping: {step} for "
                        f"Payload {cargo.ppj_payload.filename} since "
                        "it has been executed already!"
                    )
                )
                return cargo
            for required_data in step.required_data:
                if required_data not in cargo.data:
                    msg = (
                        f"[Pipeline Worker {os.getpid()}] Skipping: {step} for "
                        f"Payload {cargo.ppj_payload.filename} since it is missing "
                        f"required data {required_data}!"
                    )
                    logger.error(msg)
                    raise ValueError(msg)

            logger.info(
                (
                    f"[Pipeline Worker {os.getpid()}] Running: {step} for "
                    f"Payload {cargo.ppj_payload.filename}..."
                )
            )
            self._update_ppj_payload_of_cargo(cargo=cargo, current_step_name=step.name)

            cargo = step.run(cargo)

            cargo.finished_steps.append(step)
            if len(cargo.next_steps) > 0:
                cargo.next_steps.pop(0)

            logger.debug(f"[Pipeline Worker {os.getpid()}] Finished: {step} !")

        except Exception as e:
            msg = (
                "An error occurred while executing the PreprocessingPipeline("
                f"{self._dt}) for PreprocessingJobPayload "
                f"{cargo.ppj_payload.filename}!\n"
                f"Error: {e}"
            )
            logger.error(msg)
            cargo = self._update_ppj_payload_of_cargo(
                cargo=cargo,
                status=BackgroundJobStatus.ERROR,
                error_msg=msg,
            )
        finally:
            return cargo

    def _update_ppj_payload_of_cargo(
        self,
        cargo: PipelineCargo,
        current_step_name: Optional[str] = None,
        status: Optional[BackgroundJobStatus] = None,
        error_msg: Optional[str] = None,
    ) -> PipelineCargo:
        # we have to set the members explicitly due to pydantic default value behavior
        update_dto = PreprocessingJobPayloadUpdate()
        if current_step_name is not None:
            update_dto.current_pipeline_step = current_step_name
        if status is not None:
            update_dto.status = status
        if error_msg is not None:
            update_dto.error_message = error_msg
        with self.sqls.db_session() as db:
            db_obj = crud_prepro_job_payload.update(
                db=db,
                uuid=cargo.ppj_payload.id,
                update_dto=update_dto,
            )
            cargo.ppj_payload = PreprocessingJobPayloadRead.from_orm(db_obj)
        return cargo

    def freeze(self) -> None:
        logger.info(f"Freezing the PreprocessingPipeline({self._dt})!")
        self.__is_frozen = True

    def register_step(
        self,
        func: Callable[[PipelineCargo], PipelineCargo],
        required_data: List[str] = [],
    ):
        if self.__is_frozen:
            msg = (
                f"Cannot register new PipelineStep {func.__name__} "
                f"since the PreprocessingPipeline({self._dt}) is already frozen!"
            )
            logger.error(msg)
            raise ValueError(msg)
        step_instance = PipelineStep(
            name=func.__name__,
            ordering=len(self) + 1,
            required_data=required_data,
            run=func,
        )
        self._register_pipeline_step(step_instance)

    def join_pipeline(
        self,
        pipeline: "PreprocessingPipeline",
        skip_steps_with_name: List[str] = [],
    ) -> None:
        if self.__is_frozen:
            msg = (
                f"Cannot join another PreprocessingPipeline({pipeline._dt}) "
                f"since this PreprocessingPipeline({self._dt}) is already frozen!"
            )
            logger.error(msg)
            raise ValueError(msg)

        for _, step in sorted(pipeline._steps_by_ordering.items(), key=lambda i: i[0]):
            if step.name in skip_steps_with_name:
                continue

            step_with_new_ordering = PipelineStep(
                name=f"{pipeline._dt}::{step.name}",
                ordering=len(self) + 1,
                required_data=step.required_data,
                run=step.run,
            )
            self._register_pipeline_step(step_with_new_ordering)

    def __str__(self) -> str:
        steps_str = "\n\t".join(
            map(
                lambda i: str(i[1]),
                sorted(self._steps_by_ordering.items(), key=lambda i: i[0]),
            )
        )
        return f"PreprocessingPipeline({self._dt}){{\n\t{steps_str}\n}}"

    def __repr__(self) -> str:
        return str(self)

    def __len__(self) -> int:
        return len(self._steps_by_ordering)
