import re
from html.parser import HTMLParser
from io import StringIO
from itertools import accumulate
from typing import TypedDict

from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from core.doc.source_document_status_crud import crud_sdoc_status
from core.doc.source_document_status_dto import SourceDocumentStatusUpdate
from loguru import logger
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import (
    EndpointGeneration,
    Job,
    JobInputBase,
    JobPriority,
)
from systems.job_system.job_register_decorator import register_job


class HTMLMappingJobInput(JobInputBase):
    sdoc_id: int
    raw_html: str | None
    sentence_starts: list[int] | None
    sentence_ends: list[int] | None
    token_starts: list[int] | None
    token_ends: list[int] | None


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
    job_type="html_mapping",
    input_type=HTMLMappingJobInput,
    output_type=None,
    priority=JobPriority.DEFAULT,
    generate_endpoints=EndpointGeneration.NONE,
)
def handle_html_mapping_job(payload: HTMLMappingJobInput, job: Job) -> None:
    with SQLRepo().db_session() as db:
        if (
            payload.raw_html is None
            or payload.sentence_starts is None
            or payload.sentence_ends is None
            or payload.token_starts is None
            or payload.token_ends is None
        ):
            sdoc_data = crud_sdoc_data.read(db=db, id=payload.sdoc_id)
            payload.raw_html = sdoc_data.html
            payload.sentence_starts = sdoc_data.sentence_starts
            payload.sentence_ends = sdoc_data.sentence_ends
            payload.token_starts = sdoc_data.token_starts
            payload.token_ends = sdoc_data.token_ends

    # parse html
    parser = HTMLTextMapper()
    html_parse = parser(payload.raw_html)

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

    # update source document data in db
    crud_sdoc_data.update(
        db=db,
        id=payload.sdoc_id,
        update_dto=SourceDocumentDataUpdate(
            html=new_html.build(),
        ),
    )

    # Set db status
    crud_sdoc_status.update(
        db=db, id=payload.sdoc_id, update_dto=SourceDocumentStatusUpdate(es_index=True)
    )
