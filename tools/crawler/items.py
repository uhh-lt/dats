# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class IncelItem(scrapy.Item):
    raw_html = scrapy.Field()
    extracted_html = scrapy.Field()

    # write pipeline
    url = scrapy.Field()
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
            }
        )
