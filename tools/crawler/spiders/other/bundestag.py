from pathlib import Path

import scrapy
from scrapy_selenium import SeleniumRequest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


class BundestagSpider(scrapy.Spider):
    name = "bundestag"
    start_urls = ["https://dip.bundestag.de/experten-suche"]
    filename2date = {}

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # Wir warten solange, bis die Suchergebnisse geladen sind
        # yield SeleniumRequest(
        #     url="https://dip.bundestag.de/experten-suche?term=Klimaklage*%20OR%20Lliuya%20OR%20(%22Bundesverfassungsgericht%20Klimaschutz*%22~20)%20OR%20(%22Hambacher%20Forst*%22%20AND%20Gerichtsentscheidung)%20OR%20(%E2%80%9CGerichtsurteil*%20Klimaschutz*%E2%80%9D~20)&f.datum.start=2015-01-01&f.datum.end=2023-10-24&rows=200",
        #     callback=self.parse_search_results_page,
        #     wait_time=10,
        #     wait_until=EC.presence_of_element_located((By.CSS_SELECTOR, ".gZpCSC")),
        # )

        start = 500
        rows = 200
        # term = "Klimaklage*%20OR%20Lliuya%20OR%20(%22Bundesverfassungsgericht%20Klimaschutz*%22~20)%20OR%20(%22Hambacher%20Forst*%22%20AND%20Gerichtsentscheidung)%20OR%20(%E2%80%9CGerichtsurteil*%20Klimaschutz*%E2%80%9D~20)&f.datum.start=2015-01-01&f.datum.end=2023-10-24"
        term = "Klimaprotest*%20OR%20Klimaaktivis*%20OR%20Klimastreik%20OR%20Klimakleber%20OR%20%22Fridays%20for%20Future%22%20OR%20(%22Letzte%20Generation%20AND%20Klima%22)%20OR%20%22Extinction%20Rebellion%22%20OR%20Endegel%C3%A4nde%20OR%20(%22Aktivismus%20Klima%22~10)%20OR%20%22Hambacher%20Forst%22&f.datum.start=2015-01-01&f.datum.end=2023-10-24"
        yield SeleniumRequest(
            url=f"https://dip.bundestag.de/experten-suche?term={term}&start={start}&rows={rows}",
            callback=self.parse_search_results_page,
            wait_time=10,
            wait_until=EC.presence_of_element_located((By.CSS_SELECTOR, ".gZpCSC")),
        )

    def parse_search_results_page(self, response):
        # wir sind auf der seite aller suchergebnisse

        elements = response.selector.css(".sc-1qu2ema-1.sc-1qu2ema-2.haYTXI.gOUSxJ")
        for element in elements:
            # extract date
            element_files_date = element.css("span::text").get()

            # extract file
            element_files = [
                x.split("/")[-1].split("#")[0]
                for x in element.css(
                    ".hsbfb4-0.sc-1xaeas4-1.boDtgk.kpwGHv::attr(href)"
                ).getall()
            ]

            for element_file in element_files:
                self.filename2date[element_file] = element_files_date

        # get a list of all links
        urls = [
            response.urljoin(x).split("#")[0]
            for x in response.selector.css(
                ".hsbfb4-0.sc-1xaeas4-1.boDtgk.kpwGHv::attr(href)"
            ).getall()
        ]
        urls = list(set(urls))

        for url in urls:
            yield scrapy.Request(
                url=response.urljoin(url),
                callback=self.save_file,
            )

    def save_file(self, response):
        file_name = response.url.split("/")[-1].split("#")[0]
        date = self.filename2date.get(file_name, None)

        if date is None:
            self.logger.info("Could not find date for %s", file_name)
            return

        # save file
        self.logger.info("Saving file %s", file_name)
        path = Path(f"data/bundestag/{date}-{file_name}")
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(f"data/bundestag/{date}-{file_name}", "wb") as f:
            f.write(response.body)
