from pathlib import Path

from crawler.spiders.spider_base import SpiderBase


class DirectorySpider(SpiderBase):
    """
    This Spiders reads *.html files from disk and passes them to the pipeline
    """

    name = "directory"

    # call with scrapy crawl postprocess -a directory
    # scrapy crawl directory -a input_dir=/home/tfischer/Notebooks/data/unbruttoblog -a output_dir=/home/tfischer/Notebooks/data/unbruttoblog -s IMAGES_STORE=/home/tfischer/Notebooks/data/unbruttoblog/images
    def __init__(self, input_dir=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if input_dir is None:
            self.log("You have to provide an input directory with -a input_directory=/path/to/directory")
            exit()

        self.input_dir = Path(input_dir)
        if not self.input_dir.is_dir():
            self.log(f"{input_dir} is not a directory!")
            exit()

        # Find all files in input dir
        files = list(self.input_dir.glob(pattern="*.html"))
        if len(files) == 0:
            self.log(f"{input_dir} contains no html files!")
            exit()

        # Create the start urls
        self.start_urls = list(map(lambda x: "file://" + str(x.absolute()), files))

    def parse(self, response, **kwargs):
        # apply pipeline
        item = self.init_incel_item(response=response)
        yield item
