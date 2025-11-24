from loguru import logger

from common.job_type import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataUpdate
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.html.html_mapping_utils import HTMLTextMapper, StringBuilder
from repos.db.sql_repo import SQLRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job

sqlr = SQLRepo()


class TextHTMLMappingJobInput(SdocProcessingJobInput):
    raw_html: str
    sentence_starts: list[int]
    sentence_ends: list[int]
    token_starts: list[int]
    token_ends: list[int]


def enrich_for_recompute(
    payload: SdocProcessingJobInput,
) -> TextHTMLMappingJobInput:
    with sqlr.db_session() as db:
        sdoc_data = crud_sdoc_data.read(
            db=db,
            id=payload.sdoc_id,
        )

        return TextHTMLMappingJobInput(
            **payload.model_dump(),
            raw_html=sdoc_data.html,
            sentence_starts=sdoc_data.sentence_starts,
            sentence_ends=sdoc_data.sentence_ends,
            token_starts=sdoc_data.token_starts,
            token_ends=sdoc_data.token_ends,
        )


@register_job(
    job_type=JobType.TEXT_HTML_MAPPING,
    input_type=TextHTMLMappingJobInput,
    enricher=enrich_for_recompute,
)
def handle_text_html_mapping_job(payload: TextHTMLMappingJobInput, job: Job) -> None:
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

    with sqlr.db_session() as db:
        # update source document data in db
        crud_sdoc_data.update(
            db=db,
            id=payload.sdoc_id,
            update_dto=SourceDocumentDataUpdate(
                html=new_html.build(),
            ),
        )
