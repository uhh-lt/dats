import random

from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import conf
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.project.project_crud import crud_project
from core.user.user_crud import SYSTEM_USER_IDS
from modules.llm_assistant.llm_job_dto import (
    LLMPromptTemplates,
    SentenceAnnotationParams,
)
from modules.llm_assistant.prompts.prompt_builder import DataTag, PromptBuilder
from repos.llm_repo import LLMMessage

sent_anno_conf = conf.llm_assistant.sentence_annotation


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
{}

Please answer in this format. Do not provide your reasoning. Only use the provided categories.
Sentence ID: <sentence number>
Category: <category>

e.g.
{}

This is the document, sentence by sentence:
<document>

Remember you do not have to provide a category for each sentence. Only assign a category if you are sure that the category fits well to the sentence. Use only the provided categories!
"""

en_example_template = """
Sentence ID: {}
Category: {}
"""


# GERMAN

de_prompt_template = """
Bitte nutze die folgenden Kategorien um Sätze des gegebenen Dokumentes zu klassifizieren:
{}

Bitte anworte in diesem Format. Gebe keine Begründung an. Verwende nur die bereitgestellten Kategorien.
Satz ID: <Satz Nummer>
Kategorie: <Kategorie>

e.g.
{}

Dies ist das Dokument, Satz für Satz:
<document>

Denke daran, dass du nicht für jeden Satz eine Kategorie angeben musst. Vergebe nur eine Kategorie, wenn du dir sicher bist, dass die Kategorie gut zu dem Satz passt. Verwende ausschließlich die bereitgestellten Kategorien!
"""

de_example_template = """
Satz ID: {}
Kategorie: {}
"""


class SentenceAnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    example_templates = {
        "en": en_example_template.strip(),
        "de": de_example_template.strip(),
    }

    def __init__(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        # either prompt templates are provided
        prompt_templates: list[LLMPromptTemplates] | None = None,
        # or the parameters to build them
        params: SentenceAnnotationParams | None = None,
        example_ids: list[int] | None = None,
    ):
        project = crud_project.read(db=db, id=project_id)
        self.db = db
        self.codes = project.codes
        self.codename2id_dict = {code.name.lower(): code.id for code in self.codes}
        self.codeid2name_dict = {code.id: code.name for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

        super().__init__(
            db,
            project_id,
            is_fewshot=is_fewshot,
            valid_data_tags=[DataTag.DOCUMENT, DataTag.SENTENCE],
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    def build_prompt(
        self, language: str, sdoc_data: SourceDocumentDataORM
    ) -> list[LLMMessage]:
        match self.data_tag:
            case DataTag.DOCUMENT:
                # we need to provide document sentence by sentence for sentence annotation
                document_sentences = "\n".join(
                    [
                        f"{idx + 1}: {sentence}"
                        for idx, sentence in enumerate(sdoc_data.sentences)
                    ]
                )
                datas = [document_sentences]
            case DataTag.SENTENCE:
                datas = sdoc_data.sentences
            case _:
                raise ValueError(f"Data tag {self.data_tag} not supported!")  # type: ignore

        messages: list[LLMMessage] = []
        system_prompt = self._build_system_prompt(language)
        for data in datas:
            user_prompt = self._build_user_prompt(
                language=language,
                data=data,
            )
            messages.append(
                LLMMessage(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
            )

        return messages

    def _build_example(self, language: str, code_ids: list[int]) -> str:
        examples: list[str] = []
        for code_id in code_ids:
            if code_id not in self.codeid2name_dict:
                continue
            examples.append(self.codeid2name_dict[code_id])

        if len(examples) == 0:
            # choose 3 random examples
            examples.extend(random.sample(list(self.codeid2name_dict.values()), 3))

        examples = [
            self.example_templates[language].format(idx, example)
            for idx, example in enumerate(examples)
        ]

        return "\n".join(examples)

    def _build_user_prompt_template(
        self,
        *,
        language: str,
        example_ids: list[int] | None = None,
        params: SentenceAnnotationParams,
    ) -> str:
        if self.is_fewshot:
            from core.annotation.sentence_annotation_crud import crud_sentence_anno
            from core.doc.source_document_crud import crud_sdoc

            # find sentence annotations
            if example_ids is None:
                sentence_annotations = [
                    sa
                    for sa in crud_sentence_anno.read_by_codes(
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
                if sa.code_id not in code_id2sentence_annotations:
                    code_id2sentence_annotations[sa.code_id] = []
                code_id2sentence_annotations[sa.code_id].append(sa)

            # select configured number of examples
            if example_ids is None:
                for code_id, annotations in code_id2sentence_annotations.items():
                    assert len(annotations) >= sent_anno_conf.few_shot_threshold, (
                        f"Code {code_id} has less than {sent_anno_conf.few_shot_threshold} annotations!"
                    )
                    code_id2sentence_annotations[code_id] = random.sample(
                        annotations, sent_anno_conf.few_shot_threshold
                    )

            # find corrsponding sdoc datas
            sdoc_ids = [sa.sdoc_id for sa in sentence_annotations]
            sdoc_id2data = {
                sdoc.id: sdoc
                for sdoc in crud_sdoc.read_data_batch(db=self.db, ids=sdoc_ids)
                if sdoc is not None
            }

            # build task data
            task_data = "\n".join(
                [
                    f"{self.codeids2code_dict[code_id].name}: {self.codeids2code_dict[code_id].description} For example:\n"
                    + "\n".join(
                        [
                            "-"
                            + " ".join(
                                sdoc_id2data[sa.sdoc_id].sentences[
                                    sa.sentence_id_start : sa.sentence_id_end + 1
                                ]
                            )
                            for sa in code_id2sentence_annotations[code_id]
                        ]
                    )
                    + "\n"
                    for code_id in params.code_ids
                ]
            )
        else:
            task_data = "\n".join(
                [
                    f"{self.codeids2code_dict[code_id].name}: {self.codeids2code_dict[code_id].description}"
                    for code_id in params.code_ids
                ]
            )
        answer_example = self._build_example(language, params.code_ids)
        return self.prompt_templates[language].format(task_data, answer_example)

    def parse_result(
        self, result: LLMSentenceAnnotationResults
    ) -> list[LLMParsedSentenceAnnotationResult]:
        parsed_results = []
        for annotation in result.data:
            if annotation.category.lower() not in self.codename2id_dict:
                continue

            code_id = self.codename2id_dict[annotation.category.lower()]
            parsed_results.append(
                LLMParsedSentenceAnnotationResult(
                    sent_id=annotation.sent_id, code_id=code_id
                )
            )
        return parsed_results
