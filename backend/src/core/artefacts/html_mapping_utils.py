import re
from html.parser import HTMLParser
from io import StringIO
from itertools import accumulate
from typing import TypedDict


class Text(TypedDict):
    text: str
    start: int
    end: int
    new_block: bool


class CustomLineHTMLParser(HTMLParser):
    result: list[Text]

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

    def __call__(self, data: str) -> list[Text]:
        self.reset()
        self.line_lengths = [0] + list(
            accumulate(len(line) for line in data.splitlines(keepends=True))
        )
        self.feed(data)
        self.close()
        return self.result


class HTMLTextMapper(CustomLineHTMLParser):
    BLOCK_TAGS = {
        "p",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "div",
        "ul",
        "ol",
        "li",
        "table",
        "tr",
        "td",
        "th",
        "thead",
        "tbody",
        "section",
        "article",
        "aside",
        "header",
        "footer",
        "nav",
        "pre",
        "address",
        "fieldset",
        "legend",
        "hr",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = []
        self.text: Text | None = None
        self.end_spaces = 0
        self.block_boundary_crossed = True

    def reset(self):
        super().reset()
        self.result = []
        self.text = None
        self.block_boundary_crossed = True

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
                "new_block": self.block_boundary_crossed,
            }

    def handle_starttag(self, tag, attrs):
        self.text_end()
        if tag.lower() in self.BLOCK_TAGS:
            self.block_boundary_crossed = True

    def handle_endtag(self, tag):
        self.text_end()
        if tag.lower() in self.BLOCK_TAGS:
            self.block_boundary_crossed = True

    def handle_comment(self, data):
        self.text_end()

    def text_end(self):
        if self.text:
            self.text["end"] = self.current_index - self.end_spaces
            self.result.append(self.text)
            self.text = None
            self.end_spaces = 0
            self.block_boundary_crossed = False

    def close(self):
        super().close()
        self.text_end()


class StringBuilder(StringIO):
    def __iadd__(self, str: str):
        self.write(str)
        return self

    def build(self):
        return self.getvalue()
