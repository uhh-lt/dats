import scrapy


# The model for a scraped item (i.e., crawled URL)
# https://docs.scrapy.org/en/latest/topics/items.html
class CrawledItem(scrapy.Item):
    url = scrapy.Field()
    access_date = scrapy.Field()

    raw_html = scrapy.Field()

    image_urls = scrapy.Field()
    image_names = scrapy.Field()
    images = scrapy.Field()

    video_urls = scrapy.Field()
    video_names = scrapy.Field()
    videos = scrapy.Field()

    audio_urls = scrapy.Field()
    audio_names = scrapy.Field()
    audios = scrapy.Field()

    title = scrapy.Field()
    clean_html = scrapy.Field()

    filename = scrapy.Field()
    output_dir = scrapy.Field()

    def __repr__(self):
        """only print out interesting data after exiting a Pipeline"""
        return repr(
            {
                "url": self.get("url", ""),
                "access_date": self.get("access_date", ""),
                "title": self.get("title", ""),
                "image_names": self.get("image_names", []),
                "videos": self.get("videos", []),
                "video_urls": self.get("video_urls", []),
                "audio_names": self.get("audio_names", []),
                "filename": self.get("filename", ""),
                "output_dir": self.get("output_dir", ""),
            }
        )
