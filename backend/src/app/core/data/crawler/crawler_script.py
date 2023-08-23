import shutil
from pathlib import Path

from loguru import logger
from scrapy.crawler import CrawlerProcess
from twisted.internet import asyncioreactor

from app.core.data.dto.crawler_job import CrawlerJobRead
from app.core.data.repo.repo_service import RepoService

asyncioreactor.install()

import argparse

from twisted.internet import reactor

from app.core.data.crawler.crawler_service import (
    CrawlerJobAlreadyStartedOrDoneError,
    CrawlerService,
)
from app.core.data.crawler.crawler_settings import get_settings
from app.core.data.crawler.spiders.list_of_urls_spider import ListOfURLSSpider
from app.core.data.dto.background_job_base import BackgroundJobStatus

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("crawler_job_id", type=str)

    args = parser.parse_args()
    crawler_job_id = args.crawler_job_id

    cs: CrawlerService = CrawlerService()
    repo: RepoService = RepoService()

    cj: CrawlerJobRead = cs.get_crawler_job(crawler_job_id=crawler_job_id)

    try:
        if cj.status != BackgroundJobStatus.WAITING:
            raise CrawlerJobAlreadyStartedOrDoneError(crawler_job_id=crawler_job_id)

        cj = cs._update_crawler_job(
            status=BackgroundJobStatus.RUNNING, crawler_job_id=crawler_job_id
        )
        logger.info(f"Successfully loaded CrawlerJob {cj.id}!")

        # resolve relative path
        cj.images_store_path = str(repo.repo_root / cj.images_store_path)
        cj.videos_store_path = str(repo.repo_root / cj.videos_store_path)
        cj.audios_store_path = str(repo.repo_root / cj.audios_store_path)
        cj.output_dir = str(repo.repo_root / cj.output_dir)

        logger.info(f"Storing output at {cj.output_dir}!")

        settings = get_settings(
            images_store_path=Path(cj.images_store_path),
            videos_store_path=Path(cj.videos_store_path),
            audios_store_path=Path(cj.audios_store_path),
        )

        logger.info("Starting Scrapy CrawlerProcess! ... ")
        process: CrawlerProcess = CrawlerProcess(settings=settings)
        process.crawl(
            ListOfURLSSpider,
            list_of_urls=cj.parameters.urls,
            output_dir=cj.output_dir,
        )
        process.start()  # the script will block here until the crawling is finished
        logger.info("Scrapy CrawlerProcess has finished!")

        logger.info("Zipping crawled data!")
        crawled_data_zip = cs._create_crawled_results_zip(cj)

        logger.info("Removing all crawled data from temporary files!")
        shutil.rmtree(cj.output_dir)

        # move the zip to the project to import it afterward
        repo.move_file_to_project_sdoc_files(
            proj_id=cj.parameters.project_id, src_file=crawled_data_zip
        )
        cs._update_crawler_job(
            status=BackgroundJobStatus.FINISHED,
            crawled_data_zip_path=str(crawled_data_zip),
            crawler_job_id=crawler_job_id,
        )
        logger.info(f"Zipped crawled data at: {crawled_data_zip}")

    except Exception as e:
        logger.error(f"Cannot finish CrawlerJob {cj.id}: {e}")
        cs._update_crawler_job(
            status=BackgroundJobStatus.ERROR,
            crawler_job_id=crawler_job_id,
        )
        raise e
