# ruff: noqa: E402
import argparse
import zipfile
from pathlib import Path

from loguru import logger
from repos.filesystem_repo import FilesystemRepo
from scrapy.crawler import CrawlerProcess
from twisted.internet import asyncioreactor

asyncioreactor.install()


from modules.crawler.crawler_settings import get_settings
from modules.crawler.spiders.list_of_urls_spider import ListOfURLSSpider

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=str)
    parser.add_argument("image_dir", type=str)
    parser.add_argument("urls", nargs="+", type=str)
    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    image_dir = Path(args.image_dir)
    urls = args.urls

    fsr: FilesystemRepo = FilesystemRepo()

    # resolve relative path
    image_dir = fsr.root_dir / image_dir
    output_dir = fsr.root_dir / output_dir

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
    zip_path = output_dir.with_suffix(".zip")
    export_zip = fsr.create_temp_file(zip_path)
    crawled_files = [file for file in output_dir.glob("*.html") if file.is_file()]
    with zipfile.ZipFile(export_zip, mode="w") as zipf:
        for file in map(Path, crawled_files):
            zipf.write(file, file.name)
    logger.info(f"Added {len(crawled_files)} files to {export_zip}")

    logger.info("Removing all crawled data from temporary files!")
    # shutil.rmtree(output_dir)

    print(export_zip.relative_to(fsr.root_dir))
