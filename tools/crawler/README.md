# Blog & Forum Crawler

This tool utilizes Scrapy to crawl blogs and forums and offers a good basis to expand on to crawl other webpages.
Crawled pages are post-processed in a multi-step pipeline consisting of:

- Applying Readability to the webpage
- Cleaning the text output
- Cleaning the html output
- Extracting & downloading images
- Replacing image src with downloaded images filenames
- Write the results in multiple formats (txt, json, html, images)

## Requirements

- Python
- Readability
- Scrapy
- python-magic

## Installation

```
pip install scrapy python-magic
```

## Settings

All settings can be changed in settings.py. For example, to adjust the execution order of the pipeline's steps change the
ITEM_PIPELINES array. Every setting can be overwritten in the CLI by specifying `-s SETTING=my_custom_value`. For example,
to change the save location of images, you can set `-s IMAGES_STORE=/path/to/images`.

## Usage

Scrapy uses so-called "spiders" to scrape and download webpages. Existing spiders for multiple different forums and blogs
are stored in the spiders directory. Every spider corresponds to a specific webpage and utilizes specific CSS Selectors to
extract the content and navigate the website.

After downloading a website, the created "Item" is passed through the post-processing pipeline, which consists of multiple
steps. All pipeline steps are stored in the pipelines directory. The pipeline can be adjusted in settings.py.

Check the following example commands to see how to use this tool:

## Examples

```
# global voices
scrapy crawl globalvoices -a prefix=gv -a output_dir=/home/tfischer/Development/dwts/data/globalvoices -s IMAGES_STORE=/home/tfischer/Development/dwts/data/globalvoices/images

# demo news
scrapy crawl generic -a prefix=demonews -a output_dir=/home/tfischer/Development/dwts/data/demonews -s IMAGES_STORE=/home/tfischer/Development/dwts/data/demonews/images

# wikinews
scrapy crawl generic -a prefix=wikinews -a output_dir=/home/tfischer/Development/dwts/data/wikinews -s IMAGES_STORE=/home/tfischer/Development/dwts/data/wikinews/images

# bbc
scrapy crawl bbc -a prefix=bbc -a output_dir=/home/tfischer/Development/dwts/data/bbc -s IMAGES_STORE=/home/tfischer/Development/dwts/data/bbc/images

# tagesschau [315 docs] [825 imgs]
scrapy crawl tagesschau -a prefix=tagesschau -a output_dir=/home/tfischer/Development/dwts/data/tagesschau -s IMAGES_STORE=/home/tfischer/Development/dwts/data/tagesschau/images

# ilredpillatore [315 docs] [825 imgs]
scrapy crawl ilredpillatore -a prefix=ilredpillatore -a output_dir=/home/tfischer/Notebooks/data/ilredpillatore -s IMAGES_STORE=/home/tfischer/Notebooks/data/ilredpillatore/images

# incelblog [15 docs] [12 imgs]
scrapy crawl incelblog -a prefix=incelblog -a output_dir=/home/tfischer/Notebooks/data/incelblog -s IMAGES_STORE=/home/tfischer/Notebooks/data/incelblog/images

# ramispogli [24 docs] [39 imgs]
scrapy crawl ramispogli -a prefix=ramispogli -a output_dir=/home/tfischer/Notebooks/data/ramispogli -s IMAGES_STORE=/home/tfischer/Notebooks/data/ramispogli/images

# unbruttoblog [66 docs] [33 imgs]
scrapy crawl unbruttoblog -a prefix=unbruttoblog -a output_dir=/home/tfischer/Notebooks/data/unbruttoblog -s IMAGES_STORE=/home/tfischer/Notebooks/data/unbruttoblog/images

# totalitarismo [177 docs] [230 imgs]
scrapy crawl totalitarismo -a prefix=totalitarismo -a output_dir=/home/tfischer/Notebooks/data/totalitarismo -s IMAGES_STORE=/home/tfischer/Notebooks/data/totalitarismo/images

# ilforumdegliincel [902 docs] [90 imgs]
scrapy crawl ilforumdegliincel -a output_dir=/home/tfischer/Notebooks/data/ilforumdegliincel/presentazioni -a thread_id=79368457 -a max_pages=600 -s IMAGES_STORE=/home/tfischer/Notebooks/data/ilforumdegliincel/presentazioni/images

# ilforumdeibrutti [6379 docs] [960 imgs]
scrapy crawl ilforumdeibrutti -a prefix=ilforumdeibrutti -a output_dir=/home/tfischer/Notebooks/data/ilforumdeibrutti/presentazioni -a thread_id=75016454 -a max_pages=3600 -s IMAGES_STORE=/home/tfischer/Notebooks/data/ilforumdeibrutti/presentazioni/images

# incelsis [99475 docs] [6882 imgs]
scrapy crawl incelsis -a prefix=incelsis -a output_dir=/home/tfischer/Notebooks/data/incelsis -a page=5 -a max_pages=100 -s IMAGES_STORE=/home/tfischer/Notebooks/data/incelsis/images

# incelsnet [680 docs] [407 imgs]
scrapy crawl incelsnet -a prefix=incelsnet -a output_dir=/home/tfischer/Notebooks/data/incelsnet/quality -s IMAGES_STORE=/home/tfischer/Notebooks/data/incelsnet/quality/images

# unbruttoforum [219 docs] [76 imgs]
scrapy crawl unbruttoforum -a prefix=unbruttoforum -a output_dir=/home/tfischer/Notebooks/data/unbruttoforum/presentazioni -a thread_id=79221466 -a max_pages=169 -s IMAGES_STORE=/home/tfischer/Notebooks/data/unbruttoforum/presentazioni/images
```

## Extending the spiders

- Use `scrapy shell https://my-interesting-website.com` to get an interactive scrapy version of the website
- Use the developer tools of your browser to get CSS Selectors to your desired content
- Check your CSS Selectors using response.css('')
- Implement a new spider using the found CSS Selectors in the spiders directory
