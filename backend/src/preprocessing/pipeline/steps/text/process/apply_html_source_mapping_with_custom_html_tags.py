from io import StringIO

from loguru import logger
from preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


class StringBuilder(StringIO):
    def __iadd__(self, str: str):
        self.write(str)
        return self

    def build(self):
        return self.getvalue()


def apply_html_source_mapping_with_custom_html_tags(
    cargo: PipelineCargo,
) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]

    new_html = StringBuilder()
    current_position = 0

    sentences = pptd.sentences
    current_sentence_idx = 0
    # <html><body><p><sent id=0><t id=0>Today,</t><t id=1> </t>i<t id=2>n </t>t<t id=3>he w</t>o<t id=4>r</t>l<t id=5>d of fr</t>e<t id=6>ed</t>o<t id=7>m, the </t>p<t id=8>roud</t>e<t id=9>st</t> <t id=10>bo</t>a<t id=11>st</t> <t id=12>is</t>,<t id=13></t> <t id=14>Ich bin</t> ein B -Leader!</p></body></html>
    for token_id, (text_start, text_end) in enumerate(pptd.token_character_offsets):
        try:
            html_start = pptd.text2html_character_offsets[text_start]
            html_end = pptd.text2html_character_offsets[text_end]
        except IndexError as e:
            logger.error(f"'${pptd.filename}' seems to be corrupted! {e}")
            raise e
        new_html += pptd.html[current_position:html_start]
        if (
            len(sentences) > current_sentence_idx
            and sentences[current_sentence_idx].end == text_end
        ):
            new_html += "</sent>"
            current_sentence_idx += 1

        if (
            len(sentences) > current_sentence_idx
            and sentences[current_sentence_idx].start == text_start
        ):
            new_html += f"<sent id={current_sentence_idx}>"

        new_html += f"<t id={token_id}>"
        new_html += pptd.html[html_start:html_end]
        new_html += "</t>"

        current_position = html_end
    logger.info(f"outer {len(pptd.html)} {current_position}")
    new_html += pptd.html[current_position:]

    pptd.html = new_html.build()

    return cargo
