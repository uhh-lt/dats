from crawler.spiders.spider_base import SpiderBase


class RamispogliSpider(SpiderBase):
    name = "ramispogli"
    current_thread_page = 1
    current_pages = 0
    start_urls = [
        "https://www.ramispogli.it/le-spose-di-tecnosatana/",
        "https://www.ramispogli.it/perche-alarico-difende-gli-incel/",
        "https://www.ramispogli.it/risposta-al-collettivo-legauche/",
        "https://www.ramispogli.it/sulla-liberazione-sessuale-2/",
        "https://www.ramispogli.it/perche-non-dovresti-mai-utilizzare-tinder-se-sei-un-uomo-non-attraente/",
        "https://www.ramispogli.it/socialismo-e-questione-maschile-incel-con-fabrizio-marchi-e-francesco-alarico-della-scala/",
        "https://www.ramispogli.it/mia-intervista-su-class-alfa/",
        "https://www.ramispogli.it/in-ricordo-di-matteo-montanari-comunista-evoliano/",
        "https://www.ramispogli.it/in-difesa-della-white-sharia/",
        "https://www.ramispogli.it/sulla-liberazione-sessuale/",
        "https://www.ramispogli.it/il-mio-appoggio-a-fabrizio-marchi/",
        "https://www.ramispogli.it/il-crossover-che-nessuno-si-aspettava/",
        "https://www.ramispogli.it/femminismo-socialismo-e-liberalismo/",
        "https://www.ramispogli.it/risposta-ad-adriano-scianca/",
        "https://www.ramispogli.it/le-femministe-iniziano-a-gettare-la-maschera/",
        "https://www.ramispogli.it/il-problema-con-onlyfans-lo-sfruttamento-degli-uomini-soli/",
        "https://www.ramispogli.it/il-ritorno-degli-eunuchi/",
        "https://www.ramispogli.it/manifesto-patriarcale/",
        "https://www.ramispogli.it/la-pedofilia-nei-gruppi-anti-incel/",
        "https://www.ramispogli.it/le-conseguenze-del-corpo-femminile-scoperto/",
        "https://www.ramispogli.it/i-pick-up-artist-pua-e-i-coach-del-dating-sono-una-truffa/",
        "https://www.ramispogli.it/perche-il-terrorismo-islamico-in-occidente/",
        "https://www.ramispogli.it/lodio-irrazionale-contro-gli-incel/",
        "https://www.ramispogli.it/la-cronaca-nera-in-chiave-redpillata/",
        "https://www.ramispogli.it/i-neo-pagani-de-noantri/",
        "https://www.ramispogli.it/il-problema-della-destra-con-gli-incel-e-la-redpill/",
        "https://www.ramispogli.it/la-vera-storia-di-guerriglia-memetica-blackpillata/",
        "https://www.ramispogli.it/presentazione-del-blog-e-del-forum/",
    ]

    # provide arguments using the -a option
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def parse(self, response, **kwargs):
        # write html
        self.write_raw_response(response=response)

        # apply pipeline
        item = self.init_item(response=response)
        yield item
