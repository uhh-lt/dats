import re
from html.parser import HTMLParser
from itertools import accumulate
from typing import List, Optional, TypedDict

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


class Text(TypedDict):
    text: str
    start: int
    end: int


class CustomLineHTMLParser(HTMLParser):
    result: List[Text]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = []

    def reset(self):
        super().reset()
        self.result = []

    @property
    def current_index(self):
        line, char = self.getpos()
        return self.line_lengths[line - 1] + char

    def __call__(self, data: str) -> List[Text]:
        self.reset()
        self.line_lengths = [0] + list(
            accumulate(len(line) for line in data.splitlines(keepends=True))
        )
        self.feed(data)
        self.close()
        return self.result


class HTMLTextMapper(CustomLineHTMLParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = []
        self.text: Optional[Text] = None
        self.end_spaces = 0

    def reset(self):
        super().reset()
        self.result = []
        self.text = None

    def handle_data(self, data: str):
        # only add text if it is not only whitespaces!
        if not data.isspace():
            match = re.match(r"^(\s+)", data)
            start_spaces = 0
            if match and match.group(1):
                start_spaces = len(match.group(1))

            match2 = re.match(r".*(\s+)$", data)
            if match2 and match2.group(1):
                self.end_spaces = len(match2.group(1))

            self.text = {
                "text": data.strip(),
                "start": self.current_index + start_spaces,
                "end": -1,
            }

    def handle_starttag(self, tag, attrs):
        self.text_end()

    def handle_endtag(self, tag):
        self.text_end()

    def handle_comment(self, data):
        self.text_end()

    def text_end(self):
        if self.text:
            self.text["end"] = self.current_index - self.end_spaces
            self.result.append(self.text)
            self.text = None
            self.end_spaces = 0

    def close(self):
        super().close()
        self.text_end()


def extract_text_from_html_and_create_source_mapping(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    content_in_html = pptd.html

    parser = HTMLTextMapper()
    results = parser(content_in_html)

    text = " ".join([str(r["text"]) for r in results])
    pptd.text = text
    text2html_character_offsets: List[int] = []
    for result in results:
        text2html_character_offsets.extend(
            range(int(result["start"]), int(result["end"]) + 1)
        )
    pptd.text2html_character_offsets = text2html_character_offsets

    return cargo
