# ruff: noqa: E402
import argparse
import zipfile
from pathlib import Path

from loguru import logger
from scrapy.crawler import CrawlerProcess
from twisted.internet import asyncioreactor

asyncioreactor.install()


from modules.crawler.crawler_settings import get_settings
from modules.crawler.spiders.list_of_urls_spider import ListOfURLSSpider

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=str)
    parser.add_argument("image_dir", type=str)
    parser.add_argument("archive_path", type=str)
    parser.add_argument("urls", nargs="+", type=str)
    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    image_dir = Path(args.image_dir)
    archive_path = Path(args.archive_path)
    urls = args.urls

    settings = get_settings(
        images_store_path=image_dir,
    )

    logger.info("Starting Scrapy CrawlerProcess! ... ")
    process: CrawlerProcess = CrawlerProcess(settings=settings)
    process.crawl(
        ListOfURLSSpider,
        list_of_urls=urls,
        output_dir=output_dir,
    )
    process.start()  # the script will block here until the crawling is finished
    logger.info("Scrapy CrawlerProcess has finished!")

    logger.info("Creating ZIP Archive of Crawled Results!")
    crawled_files = [file for file in output_dir.glob("*.html") if file.is_file()]
    with zipfile.ZipFile(archive_path, mode="w") as zipf:
        for file in map(Path, crawled_files):
            zipf.write(file, file.name)
    logger.info(f"Added {len(crawled_files)} files to {archive_path}")
