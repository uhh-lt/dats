import os
import subprocess
import zipfile
from pathlib import Path
from typing import List, Optional

from common.singleton_meta import SingletonMeta
from core.project.project_crud import crud_project
from loguru import logger
from modules.crawler.crawler_job_dto import (
    CrawlerJobCreate,
    CrawlerJobParameters,
    CrawlerJobRead,
    CrawlerJobUpdate,
)
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from repos.redis_repo import RedisRepo
from systems.job_system.background_job_base_dto import BackgroundJobStatus


class NoDataToCrawlError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


class CrawlerJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the CrawlerJob! {cause}")


class CrawlerJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, crawler_job_id: str) -> None:
        super().__init__(
            f"The CrawlerJob with ID {crawler_job_id} already started or is done!"
        )


class NoSuchCrawlerJobError(Exception):
    def __init__(self, crawler_job_id: str, cause: Exception) -> None:
        super().__init__(
            f"There exists not CrawlerJob with ID {crawler_job_id}! {cause}"
        )


class UnknownCrawlerJobError(Exception):
    def __init__(self, crawler_job_id: str) -> None:
        super().__init__(
            f"The CrawlerJob with ID {crawler_job_id} could not finish for unkown reasons!"
        )


# https://stackoverflow.com/questions/70961319/how-to-run-scrapy-spiders-in-celery
# https://stackoverflow.com/questions/22116493/run-a-scrapy-spider-in-a-celery-task?noredirect=1&lq=1
# class _ScrapyHelperBilliardProcess(Process):
#     def __init__(self, settings: Dict[str, Any], cj: CrawlerJobRead):
#         Process.__init__(self)
#         self.crawler = Crawler(ListOfURLSSpider, settings)
#         # self.crawler.signals.connect(reactor.stop, signal=signals.spider_closed)
#         self.list_of_urls = cj.parameters.urls
#         self.output_dir = cj.output_dir

#     def run(self):
#         d = self.crawler.crawl(self.list_of_urls, self.output_dir)
#         reactor.run()
#         return d


# def _run_spider(settings: Dict[str, Any], cj: CrawlerJobRead):
#     crawler = Crawler(ListOfURLSSpider, settings)
#     crawler.signals.connect(reactor.stop, signal=signals.spider_closed)
#     crawler.crawl(cj.parameters.urls, cj.output_dir)
#     reactor.run()


#     crawler = Crawler(ListOfURLSSpider, settings)
#     crawler.signals.connect(reactor.stop, signal=signals.spider_closed)
#     crawler.crawl(cj.parameters.urls, cj.output_dir)
#     reactor.run()


# import multiprocessing.pool


# class NoDaemonProcess(multiprocessing.Process):
#     @property
#     def daemon(self):
#         return False

#     @daemon.setter
#     def daemon(self, value):
#         pass


# class NoDaemonContext(type(multiprocessing.get_context())):
#     Process = NoDaemonProcess


# # We sub-class multiprocessing.pool.Pool instead of multiprocessing.Pool
# # because the latter is only a wrapper function, not a proper class.
# class NestablePool(multiprocessing.pool.Pool):
#     def __init__(self, *args, **kwargs):
#         kwargs["context"] = NoDaemonContext()
#         super(NestablePool, self).__init__(*args, **kwargs)


class CrawlerService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.redis: RedisRepo = RedisRepo()
        cls.sqlr: SQLRepo = SQLRepo()

        return super(CrawlerService, cls).__new__(cls)

    def _assert_all_requested_data_exists(
        self, crawler_params: CrawlerJobParameters
    ) -> None:
        if len(crawler_params.urls) == 0:
            raise NoDataToCrawlError("Number of provided URLs must be at least one!")

        with self.sqlr.db_session() as db:
            crud_project.exists(
                db=db,
                id=crawler_params.project_id,
                raise_error=True,
            )

    def _create_crawled_results_zip(self, cj: CrawlerJobRead) -> Path:
        logger.info(f"Creating ZIP Archive of Crawled Results for CrawlerJob {cj.id}!")

        zip_path = Path(cj.output_dir)
        if not zip_path.suffix == ".zip":
            zip_path = zip_path.with_suffix(".zip")
        export_zip = self.fsr.create_temp_file(zip_path)

        crawled_files = [
            file for file in Path(cj.output_dir).glob("**/*") if file.is_file()
        ]

        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in map(Path, crawled_files):
                zipf.write(file, file.name)
        logger.info(f"Added {len(crawled_files)} files to {export_zip}")
        return export_zip

    def prepare_crawler_job(
        self, crawler_params: CrawlerJobParameters
    ) -> CrawlerJobRead:
        self._assert_all_requested_data_exists(crawler_params=crawler_params)

        # create the temporary output directories
        temp_output_dir = self.fsr.create_temp_dir()
        temp_images_store_path = temp_output_dir / "images"
        temp_images_store_path.mkdir()
        temp_videos_store_path = temp_output_dir / "videos"
        temp_videos_store_path.mkdir()
        temp_audios_store_path = temp_output_dir / "audios"
        temp_audios_store_path.mkdir()

        # relative directories to communicate with the celery workers
        temp_output_dir = temp_output_dir.relative_to(self.fsr.root_dir)
        temp_images_store_path = temp_images_store_path.relative_to(self.fsr.root_dir)
        temp_videos_store_path = temp_videos_store_path.relative_to(self.fsr.root_dir)
        temp_audios_store_path = temp_audios_store_path.relative_to(self.fsr.root_dir)

        cj_create = CrawlerJobCreate(
            parameters=crawler_params,
            output_dir=str(temp_output_dir),
            images_store_path=str(temp_images_store_path),
            videos_store_path=str(temp_videos_store_path),
            audios_store_path=str(temp_audios_store_path),
        )
        try:
            cj_read = self.redis.store_crawler_job(crawler_job=cj_create)
        except Exception as e:
            raise CrawlerJobPreparationError(cause=e)

        return cj_read

    def get_crawler_job(self, crawler_job_id: str) -> CrawlerJobRead:
        try:
            cj = self.redis.load_crawler_job(key=crawler_job_id)
        except Exception as e:
            raise NoSuchCrawlerJobError(crawler_job_id=crawler_job_id, cause=e)

        return cj

    def get_all_crawler_jobs(self, project_id: Optional[int]) -> List[CrawlerJobRead]:
        return self.redis.get_all_crawler_jobs(project_id=project_id)

    def _update_crawler_job(
        self,
        crawler_job_id: str,
        status: Optional[BackgroundJobStatus] = None,
        crawled_data_zip_path: Optional[str] = None,
    ) -> CrawlerJobRead:
        update = CrawlerJobUpdate(
            status=status, crawled_data_zip_path=crawled_data_zip_path
        )
        try:
            cj = self.redis.update_crawler_job(key=crawler_job_id, update=update)
        except Exception as e:
            raise NoSuchCrawlerJobError(crawler_job_id=crawler_job_id, cause=e)
        return cj

    def start_crawler_job_sync(self, crawler_job_id: str) -> Path:
        cj = self.get_crawler_job(crawler_job_id=crawler_job_id)
        try:
            # FIXME find a more elegant and clear way (maybe just create the dirs here and update the job?!)
            # do we even need the dirs in the job?!
            script_env = os.environ.copy()
            script_env["PYTHONPATH"] = os.getcwd()

            logger.info("Starting Scrapy Crawler Script! ... ")
            output = subprocess.Popen(
                [
                    "python",
                    "modules/crawler/crawler_script.py",
                    crawler_job_id,
                ],
                env=script_env,
            )
            output.communicate()  # Will block until finished
            logger.info("Finished Scrapy Crawler Script! ")

        except Exception as e:
            logger.error(
                f"Cannot finish Scrapy Crawler Script for CrawlerJob {cj.id}: {e}"
            )
            self._update_crawler_job(
                status=BackgroundJobStatus.ERROR,
                crawler_job_id=crawler_job_id,
            )
            raise e

        cj = self.get_crawler_job(crawler_job_id=crawler_job_id)
        if (
            not cj.status == BackgroundJobStatus.FINISHED
            or cj.crawled_data_zip_path is None
        ):
            logger.error(f"Cannot finish CrawlerJob {cj.id} for unkown reasons!")
            self._update_crawler_job(
                status=BackgroundJobStatus.ERROR,
                crawler_job_id=crawler_job_id,
            )
            raise UnknownCrawlerJobError(crawler_job_id=crawler_job_id)

        return Path(cj.crawled_data_zip_path)
