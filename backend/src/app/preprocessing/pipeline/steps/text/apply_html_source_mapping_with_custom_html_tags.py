from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc
from app.util.string_builder import StringBuilder


def apply_html_source_mapping_with_custom_html_tags(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    new_html = StringBuilder()
    current_position = 0

    sentences = pptd.sentences
    current_sentence_idx = 0

    for token_id, (text_start, text_end) in enumerate(pptd.token_character_offsets):
        try:
            html_start = pptd.text2html_character_offsets[text_start]
            html_end = pptd.text2html_character_offsets[text_end]
        except IndexError as e:
            logger.error(f"'${pptd.filename}' seems to be corrupted! {e}")
            raise e

        new_html += pptd.html[current_position:html_start]

        if sentences[current_sentence_idx].end_token == token_id:
            new_html += "</sent>"
            current_sentence_idx += 1

        if sentences[current_sentence_idx].start_token == token_id:
            new_html += f"<sent id={current_sentence_idx}>"

        new_html += f"<t id={token_id}>"
        new_html += pptd.html[html_start:html_end]
        new_html += "</t>"

        current_position = html_end

    new_html += pptd.html[current_position:]

    pptd.html = new_html.build()

    return cargo
