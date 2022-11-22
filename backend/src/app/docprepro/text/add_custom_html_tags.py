from typing import List

from tqdm import tqdm

from app.core.data.dto.source_document import SDocStatus
from app.docprepro.text.models.preprotextdoc import PreProTextDoc
from app.docprepro.util import update_sdoc_status


def add_custom_html_tags_(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Generating html with custom tags... "):
        new_html = ""
        current_position = 0

        sentences = pptd.spans["SENTENCE"]
        current_sentence_idx = 0

        for token_id, (text_start, text_end) in enumerate(pptd.token_character_offsets):
            html_start = pptd.text2html_character_offsets[text_start]
            html_end = pptd.text2html_character_offsets[text_end]

            new_html += pptd.html[current_position:html_start]

            if sentences[current_sentence_idx].end_token == token_id:
                new_html += f'</sent>'
                current_sentence_idx += 1

            if sentences[current_sentence_idx].start_token == token_id:
                new_html += f'<sent id={current_sentence_idx}>'

            new_html += f'<t id={token_id}>'
            new_html += pptd.html[html_start:html_end]
            new_html += '</t>'

            current_position = html_end

        new_html += pptd.html[current_position:]

        pptd.html = new_html
        # Flo: update sdoc status
        update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.add_custom_html_tags)

    return pptds