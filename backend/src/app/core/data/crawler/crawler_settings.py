# Scrapy settings as dict
#
# For simplicity, this file contains only settings considered important or
# commonly used. You can find more settings consulting the documentation:
#
#     https://docs.scrapy.org/en/latest/topics/settings.html
#     https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
#     https://docs.scrapy.org/en/latest/topics/spider-middleware.html
from pathlib import Path
from typing import Any, Dict, Union

__settings = {
    "BOT_NAME": "crawler",
    "USER_AGENT": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.3",
    "ROBOTSTXT_OBEY": False,
    "CONCURRENT_REQUESTS": 16,
    "DOWNLOAD_DELAY": 0.25,
    "COOKIES_ENABLED": False,
    "ITEM_PIPELINES": {
        "app.core.data.crawler.pipelines.clean_html_pipeline.CleanHtmlPipeline": 1,
        "app.core.data.crawler.pipelines.resolve_relative_urls.ResolveRelativeURLsPipeline": 2,
        "app.core.data.crawler.pipelines.extract_media_urls_from_html_pipeline.ExtractMediaUrlsFromHtmlPipeline": 3,
        "app.core.data.crawler.pipelines.custom_images_download_pipeline.CustomImagesDownloadPipeline": 4,
        "app.core.data.crawler.pipelines.custom_videos_download_pipeline.CustomVideosDownloadPipeline": 5,
        "app.core.data.crawler.pipelines.custom_audios_download_pipeline.CustomAudiosDownloadPipeline": 6,
        "app.core.data.crawler.pipelines.replace_media_urls_with_downloaded_names_pipeline.ReplaceMediaUrlsWithDownloadedNamesPipeline": 7,
        "app.core.data.crawler.pipelines.write_crawled_item_to_disk_pipeline.WriteCrawledItemToDiskPipeline": 8,
    },
    "IMAGES_STORE": None,
    "MEDIA_ALLOW_REDIRECTS": True,
    "REQUEST_FINGERPRINTER_IMPLEMENTATION": "2.7",
    # "TWISTED_REACTOR": "twisted.internet.epollreactor.EPollReactor",
    "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
}


def get_settings(
    images_store_path: Union[str, Path],
    videos_store_path: Union[str, Path],
    audios_store_path: Union[str, Path],
) -> Dict[str, Any]:
    images_store_path = Path(images_store_path)
    if not images_store_path.exists():
        raise ValueError(f"IMAGES_STORE {images_store_path} does not exists!")
    elif not images_store_path.is_dir():
        raise ValueError(f"IMAGES_STORE {images_store_path} must be a directory!")

    videos_store_path = Path(videos_store_path)
    if not videos_store_path.exists():
        raise ValueError(f"VIDEOS_STORE {videos_store_path} does not exists!")
    elif not videos_store_path.is_dir():
        raise ValueError(f"VIDEOS_STORE {videos_store_path} must be a directory!")

    audios_store_path = Path(audios_store_path)
    if not audios_store_path.exists():
        raise ValueError(f"AUDIOS_STORE {audios_store_path} does not exists!")
    elif not audios_store_path.is_dir():
        raise ValueError(f"AUDIOS_STORE {audios_store_path} must be a directory!")

    settings = dict(__settings)
    settings["IMAGES_STORE"] = str(images_store_path)
    settings["VIDEOS_STORE"] = str(videos_store_path)
    settings["AUDIOS_STORE"] = str(audios_store_path)
    return settings
