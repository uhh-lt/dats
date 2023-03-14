import scrapy

from crawler.spiders.spider_base import SpiderBase
from pathlib import Path


class FileWithURLsSpider(SpiderBase):
    name = "file_with_urls"
    # start_urls = [
    #     "https://www.zeit.de/digital/datenschutz/2021-06/doctolib-online-buchung-arzttermin-impftermin-datenschutz-sicherheitsluecke-patientendaten/komplettansicht",
    #     "https://mobilsicher.de/ratgeber/verstoerend-doctolib-app-teilte-sensible-informationen-mit-facebook-und-outbrain",
    #     "https://www.aerzteblatt.de/nachrichten/106679/Gesundheits-App-Ada-wegen-Datenschutz-in-der-Kritik",
    #     "https://www.datenschutz.rlp.de/de/aktuelles/detail/news/detail/News/geldbusse-gegen-krankenhaus-aufgrund-von-datenschutz-defiziten-beim-patientenmanagement/",
    #     "https://www.golem.de/news/datenleck-millionen-patientendaten-ungeschuetzt-im-netz-1909-143905.html",
    #     "https://www.heise.de/newsticker/meldung/Techniker-Krankenkasse-beendet-Zusammenarbeit-mit-Ada-4604637.html",
    #     "https://www.bertelsmann-stiftung.de/de/unsere-projekte/der-digitale-patient/projektnachrichten/studie-gesundheits-apps/",
    #     "https://www.golem.de/news/behoerden-wegen-cyberangriff-geschlossen-2003-146966.html",
    #     "https://www.golem.de/news/behoerden-wegen-cyberangriff-geschlossen-2003-146966-3.html",
    #     "https://www.golem.de/news/elektronische-patientenakte-zu-unsicher-um-gehackt-werden-zu-muessen-1912-145757.html",
    #     "https://www.golem.de/sonstiges/zustimmung/auswahl.html?from=https%3A%2F%2Fwww.golem.de%2Fnews%2Fepa-neue-e-patientenakte-startet-zunaechst-mit-testphase-2012-152608.html",
    #     "https://www.ethikrat.org/publikationen/publikationsdetail/?tx_wwt3shop_detail%5Bproduct%5D=4&tx_wwt3shop_detail%5Baction%5D=index&tx_wwt3shop_detail%5Bcontroller%5D=Products&cHash=7bb9aadb656b877f9dbd49a61e39df2f",
    #     "https://www.bmi.bund.de/SharedDocs/topthemen/DE/topthema-cybersicherheit/cybersicherheit-artikel.html;jsessionid=26D5B7DE8B572EA7288EEF723B5D2544.1_cid295",
    #     "https://www.aerztezeitung.de/Wirtschaft/Perfektion-ist-nicht-der-Sinn-des-Lebens-294755.html",
    #     "https://e-health-com.de/details-news/viele-medical-apps-haben-ein-datenschutzproblem/",
    #     "https://www.computerweekly.com/de/ratgeber/E-Health-Gesundheitsdaten-und-der-Datenschutz",
    #     "https://www.datenschutz-notizen.de/wer-diese-app-nutzt-hat-die-datenschutzbestimmungen-wohl-nicht-gelesen-1323636/",
    #     "https://www.medical-tribune.de/praxis-und-wirtschaft/ehealth/artikel/datenschutzluecken-in-ada-gesundheits-app/",
    #     "https://www.heise.de/news/Datenschutzprobleme-Ada-bessert-nach-4602775.html",
    #     "https://www.zeitschrift-sportmedizin.de/optimierung-durch-selbstvermessung-wie-lifelogging-und-online-fitness-unser-leben-nicht-veraendern/",
    #     "https://www.aerztezeitung.de/Wirtschaft/Hat-Symptom-Checker-Daten-weitergegeben-402323.html",
    #     "https://www.golem.de/sonstiges/zustimmung/auswahl.html?from=https%3A%2F%2Fwww.golem.de%2Fnews%2Fgesundheits-it-tut-mal-kurz-weh-2012-153097.html",
    #     "https://www.heise.de/news/rC3-Es-krankt-an-der-Sicherheit-im-Gesundheitswesen-5001060.html",
    #     "https://t3n.de/news/datenschutz-desaster-doctolib-1386492/",
    #     "https://digitalcourage.de/blog/2022/doctolib-verstoesst-weiter-gegen-patientengeheimnis",
    #     "https://e-health-com.de/details-news/virtueller-kongress-des-ccc-it-in-arztpraxen-und-corona-warn-app/",
    #     "https://www.spiegel.de/netzwelt/web/arztpraxen-sensible-patientendaten-waren-fuer-unbefugte-zugaenglich-a-b786d37c-8dc5-4e03-b20d-a51bb9751264",
    #     "https://www.telepolis.de/features/Ist-Doctolib-ein-Sicherheitsrisiko-6171673.html",
    #     "https://www.golem.de/news/datenschutz-doctolib-app-gab-sensible-daten-an-facebook-weiter-2106-157504.html",
    #     "https://mobilsicher.de/ratgeber/verstoerend-doctolib-app-teilte-sensible-informationen-mit-facebook-und-outbrain",
    # ]

    # provide arguments using the -a option
    def __init__(self, url_file=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if url_file is None:
            self.log(
                "You have to provide an input directory with -a url_file=/path/to/file_with_urls"
            )
            exit()

        input_file = Path(url_file)
        if not self.input_file.is_file():
            self.log(f"{input_file} is not a file!")
            exit()

        self.start_urls = input_file.read_text().splitlines()

    def parse(self, response, **kwargs):
        # apply pipeline
        item = self.init_incel_item(response=response)
        yield item
