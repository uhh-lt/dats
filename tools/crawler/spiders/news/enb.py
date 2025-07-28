import scrapy
from crawler.items import ENBItem


class ENBSpider(scrapy.Spider):
    name = "enb"
    start_urls = [
        f"https://enb.iisd.org/negotiations/un-framework-convention-climate-change-unfccc?page={i}"
        for i in range(9)
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # get a list of all links
        urls = [
            response.urljoin(x)
            for x in response.css(".c-list-item__heading-link::attr(href)").getall()
        ]
        urls = list(set(urls))

        # visit every conference
        for url in urls:
            yield scrapy.Request(response.urljoin(url), callback=self.parse_conference)

    def parse_conference(self, response, **kwargs):
        # visit the summary report
        summary_report_url = response.css(
            ".c-final-report__title-link::attr(href)"
        ).get()
        yield scrapy.Request(
            response.urljoin(summary_report_url), callback=self.parse_report
        )

    def parse_report(self, response, **kwargs):
        # parse
        title_html = response.css(".c-node__title").get()
        title = response.css(".c-node__title::text").get().strip()

        subtitle_html = response.css(".c-node__subtitle").get()
        subtitle = response.css(".c-node__subtitle::text").get().strip()

        body_html = response.css(".c-node__body").get()
        body = "".join(response.css(".c-node__body *::text").getall())

        tags_selectors = response.css(".c-tags__items")
        tags = [
            [
                x.strip()
                for x in tag_selector.css(".c-tags__item ::text").getall()
                if len(x.strip()) > 0
            ]
            for tag_selector in tags_selectors
        ]

        # construct result
        item = ENBItem()
        item["file_name"] = title
        item["output_dir"] = (
            f"/home/tfischer/Development/dats/data/enb/{subtitle.replace(' ', '_')}"
        )

        item["url"] = response.url
        item["title"] = title
        item["subtitle"] = subtitle
        item["html"] = "<html>" + title_html + subtitle_html + body_html + "</html>"
        item["text"] = title + "\n\n" + subtitle + "\n\n" + body
        item["participants"] = tags[0] if len(tags) > 0 else []
        item["tags"] = tags[1] if len(tags) > 1 else []

        # apply pipeline (we only want to write! deactivate all other pipelines)
        yield item

        # visit next report
        next_report_url = response.css(
            ".c-node__button-container > a:last-child::attr(href)"
        ).get()
        if next_report_url is not None:
            yield scrapy.Request(
                response.urljoin(next_report_url), callback=self.parse_report
            )
