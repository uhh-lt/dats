import re
from html.parser import HTMLParser
from io import StringIO
from itertools import accumulate
from typing import TypedDict

from common.doc_type import DocType
from common.job_type import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from loguru import logger
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job, JobOutputBase, SdocJobInput
from systems.job_system.job_register_decorator import register_job


class HTMLMappingJobInput(SdocJobInput):
    raw_html: str
    sentence_starts: list[int]
    sentence_ends: list[int]
    token_starts: list[int]
    token_ends: list[int]


class ExtractPlainTextJobInput(SdocJobInput):
    html: str
    filename: str
    doctype: DocType


class ExtractPlainTextJobOutput(JobOutputBase):
    text: str
    text2html_character_offsets: list[int]


class Text(TypedDict):
    text: str
    start: int
    end: int


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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.result = []
        self.text: Text | None = None
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


class StringBuilder(StringIO):
    def __iadd__(self, str: str):
        self.write(str)
        return self

    def build(self):
        return self.getvalue()


@register_job(
    job_type=JobType.EXTRACT_PLAIN_TEXT,
    input_type=ExtractPlainTextJobInput,
    output_type=ExtractPlainTextJobOutput,
)
def extract_text_from_html_and_create_source_mapping(
    payload: ExtractPlainTextJobInput,
    job: Job,
) -> ExtractPlainTextJobOutput:
    content_in_html = payload.html

    parser = HTMLTextMapper()
    results = parser(content_in_html)

    text = " ".join([str(r["text"]) for r in results])
    text2html_character_offsets: list[int] = []
    for result in results:
        text2html_character_offsets.extend(
            range(int(result["start"]), int(result["end"]) + 1)
        )

    return ExtractPlainTextJobOutput(
        text=text, text2html_character_offsets=text2html_character_offsets
    )


@register_job(
    job_type=JobType.HTML_MAPPING,
    input_type=HTMLMappingJobInput,
)
def handle_html_mapping_job(payload: HTMLMappingJobInput, job: Job) -> None:
    # parse html
    parser = HTMLTextMapper()
    html_parse = parser(payload.raw_html)

    # compute text here?
    # text = " ".join([str(r["text"]) for r in results])

    # compute offsets
    text2html_character_offsets: list[int] = []
    for hp in html_parse:
        text2html_character_offsets.extend(range(int(hp["start"]), int(hp["end"]) + 1))

    # build new html, with custom tags for tokens and sentences
    new_html = StringBuilder()
    current_sentence_idx = 0
    current_position = 0
    for token_id, (text_start, text_end) in enumerate(
        zip(payload.token_starts, payload.token_ends)
    ):
        try:
            html_start = text2html_character_offsets[text_start]
            html_end = text2html_character_offsets[text_end]
        except IndexError as e:
            logger.error(f"SDOC '${payload.sdoc_id}' seems to be corrupted! {e}")
            raise e
        new_html += payload.raw_html[current_position:html_start]
        if (
            len(payload.sentence_ends) > current_sentence_idx
            and payload.sentence_ends[current_sentence_idx] == text_end
        ):
            new_html += "</sent>"
            current_sentence_idx += 1

        if (
            len([payload.sentence_starts]) > current_sentence_idx
            and payload.sentence_starts[current_sentence_idx] == text_start
        ):
            new_html += f"<sent id={current_sentence_idx}>"

        new_html += f"<t id={token_id}>"
        new_html += payload.raw_html[html_start:html_end]
        new_html += "</t>"

        current_position = html_end
    new_html += payload.raw_html[current_position:]

    with SQLRepo().db_session() as db:
        # update source document data in db
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(
                html=new_html.build(),
            ),
        )
