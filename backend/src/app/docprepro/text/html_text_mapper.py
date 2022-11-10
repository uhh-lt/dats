import re
from html.parser import HTMLParser
from itertools import accumulate
from typing import Union, Dict, List


class CustomLineHTMLParser(HTMLParser):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = None

    def reset(self):
        super().reset()
        self.result = None

    @property
    def current_index(self):
        line, char = self.getpos()
        return self.line_lengths[line - 1] + char

    def __call__(self, data: str) -> List[Dict[str, Union[str, int]]]:
        self.reset()
        self.line_lengths = [0] + list(accumulate(len(line) for line in data.splitlines(keepends=True)))
        self.feed(data)
        self.close()
        return self.result


class HTMLTextMapper(CustomLineHTMLParser):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = []
        self.text = None
        self.end_spaces = 0

    def reset(self):
        super().reset()
        self.result = []
        self.text = None

    def handle_data(self, data: str):
        # only add text if it is not only whitespaces!
        if not data.isspace():
            match2 = re.match(r"(\s+)$", data)
            match = re.match(r"^(\s+)", data)
            start_spaces = 0
            if match and match.group(1):
                start_spaces = len(match.group(1))

            match2 = re.match(r".*(\s+)$", data)
            if match2 and match2.group(1):
                self.end_spaces = len(match2.group(1))

            self.text = {'text': data.strip(), 'start': self.current_index + start_spaces}

    def handle_starttag(self, tag, attrs):
        self.text_end()

    def handle_endtag(self, tag):
        self.text_end()

    def handle_comment(self, data):
        self.text_end()

    def text_end(self):
        if self.text:
            self.text['end'] = self.current_index - self.end_spaces
            self.result.append(self.text)
            self.text = ''
            self.end_spaces = 0

    def close(self):
        super().close()
        self.text_end()
