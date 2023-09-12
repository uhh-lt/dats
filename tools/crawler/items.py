# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class GenericWebsiteItem(scrapy.Item):
    url = scrapy.Field()
    raw_html = scrapy.Field()
    extracted_html = scrapy.Field()

    # write pipeline
    file_name = scrapy.Field()
    output_dir = scrapy.Field()

    # image pipeline
    image_urls = scrapy.Field()
    image_names = scrapy.Field()
    images = scrapy.Field()

    # readability
    html = scrapy.Field()
    text = scrapy.Field()
    title = scrapy.Field()

    # meta data
    visited_date = scrapy.Field()
    published_date = scrapy.Field()
    author = scrapy.Field()

    def __repr__(self):
        """only print out interesting data after exiting the Pipeline"""
        return repr(
            {
                "url": self["url"] if "url" in self.keys() else "",
                "file_name": self["file_name"] if "file_name" in self.keys() else "",
                "output_dir": self["output_dir"] if "output_dir" in self.keys() else "",
                "image_urls": self["image_urls"] if "image_urls" in self.keys() else [],
                "image_names": self["image_names"]
                if "image_names" in self.keys()
                else [],
                "title": self["title"] if "title" in self.keys() else [],
                "author": self["author"] if "author" in self.keys() else "",
                "published_date": self["published_date"]
                if "published_date" in self.keys()
                else "",
                "visited_date": self["visited_date"]
                if "visited_date" in self.keys()
                else "",
            }
        )


class ENBItem(scrapy.Item):
    url = scrapy.Field()
    title = scrapy.Field()
    subtitle = scrapy.Field()
    html = scrapy.Field()
    participants = scrapy.Field()
    tags = scrapy.Field()
    text = scrapy.Field()

    # write pipeline
    file_name = scrapy.Field()
    output_dir = scrapy.Field()

    def __repr__(self):
        """only print out interesting data after exiting the Pipeline"""
        return repr(
            {
                "url": self["url"] if "url" in self.keys() else "",
                "title": self["title"] if "title" in self.keys() else "",
            }
        )