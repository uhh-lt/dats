import random
from collections.abc import Iterator

from pydantic import BaseModel

from config import conf
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.user.user_crud import SYSTEM_USER_IDS
from modules.llm_assistant.llm_assistant_enum import DataTag, StrategyType
from modules.llm_assistant.llm_assistant_job_dto import (
    DefaultStrategyParams,
    SentenceAnnotationParams,
)
from modules.llm_assistant.strategies.code_annotation_strategy import (
    CodeAnnotationStrategy,
)


class LLMParsedSentenceAnnotationResult(BaseModel):
    sent_id: int
    code_id: int


class LLMSentenceAnnotationResult(BaseModel):
    sent_id: int
    category: str


class LLMSentenceAnnotationResults(BaseModel):
    data: list[LLMSentenceAnnotationResult]


# ENGLISH

en_prompt_template = """
Please use the following categories to classify sentences of the provided document:
<codes>

Classify only sentences that clearly fit. Identify them by sentence number, use only the provided categories, and do not provide reasoning.

e.g.
Sentence ID: 2
Category: Claim
{examples_block}
This is the document, sentence by sentence:
<document>

Remember you do not have to provide a category for each sentence. Only assign a category if you are sure that the category fits well to the sentence. Use only the provided categories!

"""

en_examples_header = "Examples of sentences for each category:"


# GERMAN

de_prompt_template = """
Bitte nutze die folgenden Kategorien um Sätze des gegebenen Dokumentes zu klassifizieren:
<codes>

Klassifiziere nur Sätze, auf die eine Kategorie eindeutig passt. Identifiziere sie anhand der Satznummer, verwende nur die bereitgestellten Kategorien und gib keine Begründung an.

e.g.
Satz-ID: 2
Kategorie: Behauptung
{examples_block}
Dies ist das Dokument, Satz für Satz:
<document>

Denke daran, dass du nicht für jeden Satz eine Kategorie angeben musst. Vergebe nur eine Kategorie, wenn du dir sicher bist, dass die Kategorie gut zu dem Satz passt. Verwende ausschließlich die bereitgestellten Kategorien!

"""

de_examples_header = "Beispielsätze für jede Kategorie:"


class SentenceAnnotationStrategy(CodeAnnotationStrategy[DefaultStrategyParams]):
    strategy_type = StrategyType.SENTENCE_ANNOTATION_DEFAULT
    display_name = "Sentence Annotation"
    description = (
        "Classifies each sentence of a document with the selected codes.\n"
        "\n"
        "**How it works:** The document is split into individual sentences. For each "
        "sentence, the LLM assigns one of the available codes (or none). Each sentence "
        "is classified independently.\n"
        "\n"
        "**Example:** Given the codes `Claim` and `Evidence` and the sentences:\n"
        "\n"
        "    1. Climate change is real.\n"
        "    2. Global temperatures rose by 1.1\u00b0C since 1880.\n"
        "\n"
        "The classifications are:\n"
        "\n"
        "    Sentence 1: Claim\n"
        "    Sentence 2: Evidence\n"
        "\n"
        "**When to use:** For sentence-level classification tasks like argument "
        "mining, stance detection, or discourse analysis."
    )
    strategy_params_type = DefaultStrategyParams
    allowed_data_tags = [DataTag.DOCUMENT, DataTag.SENTENCE]

    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    examples_headers = {
        "en": en_examples_header,
        "de": de_examples_header,
    }

    def get_response_model(self) -> type[BaseModel]:
        return LLMSentenceAnnotationResults

    def _iter_message_data(self, sdoc_data: SourceDocumentDataORM) -> Iterator[str]:
        match self.data_tag:
            case DataTag.DOCUMENT:
                # we need to provide document sentence by sentence for sentence annotation
                yield "\n".join(
                    f"{idx + 1}: {sentence}"
                    for idx, sentence in enumerate(sdoc_data.sentences)
                )
            case DataTag.SENTENCE:
                yield from (f"1: {sentence}" for sentence in sdoc_data.sentences)
            case _:
                raise ValueError(f"Data tag {self.data_tag} not supported!")

    def _build_examples_block(
        self,
        language: str,
        example_ids: list[int] | None,
        params: SentenceAnnotationParams,
    ) -> str:
        """Build the few-shot block of example sentences per selected code."""
        from core.annotation.sentence_annotation_crud import crud_sentence_anno
        from core.doc.source_document_data_crud import crud_sdoc_data

        # find sentence annotations
        if example_ids is None:
            sentence_annotations = [
                sa
                for sa in crud_sentence_anno.read_by_code_ids(
                    db=self.db, code_ids=params.code_ids
                )
                if sa.user_id
                not in SYSTEM_USER_IDS  # Filter out annotations of the system users
            ]
        # or use the provided examples
        else:
            sentence_annotations = crud_sentence_anno.read_by_ids(
                db=self.db, ids=example_ids
            )

        code_id2sentence_annotations: dict[int, list[SentenceAnnotationORM]] = {
            code_id: [] for code_id in params.code_ids
        }
        for sa in sentence_annotations:
            if sa.code_id in code_id2sentence_annotations:
                code_id2sentence_annotations[sa.code_id].append(sa)

        # select configured number of examples
        if example_ids is None:
            for code_id, annotations in code_id2sentence_annotations.items():
                assert len(annotations) >= conf.llm_assistant.few_shot_threshold, (
                    f"Code {code_id} has less than {conf.llm_assistant.few_shot_threshold} annotations!"
                )
                code_id2sentence_annotations[code_id] = random.sample(
                    annotations, conf.llm_assistant.few_shot_threshold
                )

        # find corrsponding sdoc datas
        sdoc_ids = [sa.sdoc_id for sa in sentence_annotations]
        sdoc_id2data = {
            sdoc.id: sdoc
            for sdoc in crud_sdoc_data.read_by_ids(db=self.db, ids=sdoc_ids)
            if sdoc is not None
        }

        examples = "\n".join(
            f"{self._code_name(code_id)}:\n"
            + "\n".join(
                "- "
                + " ".join(
                    sdoc_id2data[sa.sdoc_id].sentences[
                        sa.sentence_id_start : sa.sentence_id_end + 1
                    ]
                )
                for sa in code_id2sentence_annotations[code_id]
            )
            + "\n"
            for code_id in params.code_ids
        )
        return f"\n{self.examples_headers[language]}\n{examples}"

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: SentenceAnnotationParams,
    ) -> str:
        examples_block = ""
        if self.is_fewshot:
            examples_block = self._build_examples_block(
                language=language, example_ids=example_ids, params=params
            )
        return self.prompt_templates[language].format(examples_block=examples_block)

    def parse_result(
        self, result: LLMSentenceAnnotationResults
    ) -> list[LLMParsedSentenceAnnotationResult]:
        parsed_results = []
        for annotation in result.data:
            code_id = self._code_id_for_name(annotation.category)
            if code_id is None:
                continue

            parsed_results.append(
                LLMParsedSentenceAnnotationResult(
                    sent_id=annotation.sent_id, code_id=code_id
                )
            )
        return parsed_results
