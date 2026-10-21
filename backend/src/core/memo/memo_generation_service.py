from collections.abc import Callable

from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from common.doc_type import DocType
from common.singleton_meta import SingletonMeta
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import SpanGroupORM
from core.code.code_orm import CodeORM
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_dto import SourceDocumentRead
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.tag.tag_orm import TagORM
from repos.filesystem_repo import FilesystemRepo
from repos.llm_repo import LLMRepo
from utils.image_utils import image_to_base64, load_image

MEMO_GEN_PROMPT = "Don't use imperative form. Generate a concise, 1-2 sentence helpful memo about the following object:\n\n{obj_summary}"
MEMO_IMAGE_PROMPT = "Create a brief one sentence image description. If you recognize any person or other named entities, use their names. Return the description in a single line without any new lines or special characters. Do not include any additional text or explanations. The description should be concise and to the point, focusing on the main subject of the image. Avoid using overly complex language or jargon."

MemoObject = (
    SourceDocumentORM
    | TagORM
    | CodeORM
    | ProjectORM
    | BBoxAnnotationORM
    | SentenceAnnotationORM
    | SpanAnnotationORM
    | SpanGroupORM
)


class LLMMemoResult(BaseModel):
    memo: str


class MemoGenerationService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        cls.llm: LLMRepo = LLMRepo()
        # Each summary function returns (is_image, summary): the text summary or
        # the base64 encoded image of the object.
        cls.summary_function_for_type: dict[type, Callable[..., tuple[bool, str]]] = {
            SourceDocumentORM: cls._summarize_sdoc,
            TagORM: cls._summarize_tag,
            CodeORM: cls._summarize_code,
            ProjectORM: cls._summarize_project,
            BBoxAnnotationORM: cls._summarize_bbox_anno,
            SentenceAnnotationORM: cls._summarize_sent_anno,
            SpanAnnotationORM: cls._summarize_span_anno,
        }
        return super(MemoGenerationService, cls).__new__(cls)

    def generate_memo_suggestion(
        self, *, db: Session, obj: MemoObject, model: str
    ) -> str:
        logger.info("Started Memo Generation (LLM)")
        # 1) build the summary of the object
        summary_fn = self.summary_function_for_type.get(type(obj))
        if summary_fn is None:
            raise NotImplementedError(
                f"AttachedObjectType is not supported: {type(obj)}"
            )
        is_image, obj_summary = summary_fn(self, db=db, obj=obj)

        # 2) send it to the LLM
        if is_image:
            caption, _ = self.llm.vlm_chat(
                model=model, user_prompt=MEMO_IMAGE_PROMPT, b64_images=[obj_summary]
            )
            return caption.strip()

        response = self.llm.llm_chat(
            model=model,
            system_prompt="You are a helpful assistant generating memos.",
            user_prompt=MEMO_GEN_PROMPT.format(obj_summary=obj_summary),
            response_model=LLMMemoResult,
        )
        logger.info(f"Got chat response for object ID {obj.id}! Response={response}")
        return response.memo.strip()

    def _summarize_sdoc(
        self, *, db: Session, obj: SourceDocumentORM
    ) -> tuple[bool, str]:
        if obj.doctype == DocType.text:
            sdoc_data = crud_sdoc_data.read(db=db, id=obj.id)
            return False, "".join(sdoc_data.sentences)
        if obj.doctype == DocType.image:
            path = self.fsr.get_path_to_sdoc_file(
                sdoc=SourceDocumentRead.model_validate(obj),
                webp=False,
                thumbnail=False,
            )
            return True, image_to_base64(load_image(path))
        raise NotImplementedError(f"Can't summarize this DocType: {obj.doctype}")

    def _summarize_tag(self, *, db: Session, obj: TagORM) -> tuple[bool, str]:
        return (
            False,
            f'Document Tag with name "{obj.name}" and description "{obj.description}"',
        )

    def _summarize_code(self, *, db: Session, obj: CodeORM) -> tuple[bool, str]:
        return (
            False,
            f'Code used for classification with name "{obj.name}" and description "{obj.description}"',
        )

    def _summarize_project(self, *, db: Session, obj: ProjectORM) -> tuple[bool, str]:
        return (
            False,
            f'Project with title "{obj.title}" and description "{obj.description}"',
        )

    def _summarize_bbox_anno(
        self, *, db: Session, obj: BBoxAnnotationORM
    ) -> tuple[bool, str]:
        path = self.fsr.get_path_to_sdoc_file(
            sdoc=SourceDocumentRead.model_validate(
                obj.annotation_document.source_document
            ),
            webp=False,
            thumbnail=False,
        )
        image = load_image(path)
        cropped_image = image.crop((obj.x_min, obj.y_min, obj.x_max, obj.y_max))
        return True, image_to_base64(cropped_image)

    def _summarize_sent_anno(
        self, *, db: Session, obj: SentenceAnnotationORM
    ) -> tuple[bool, str]:
        sdoc_data = crud_sdoc_data.read(
            db=db, id=obj.annotation_document.source_document_id
        )
        return (
            False,
            f'Annotation with code title "{obj.code.name}", code description "{obj.code.description}" and the following content: {sdoc_data.sentences[obj.sentence_id_start : obj.sentence_id_end + 1]}',
        )

    def _summarize_span_anno(
        self, *, db: Session, obj: SpanAnnotationORM
    ) -> tuple[bool, str]:
        return (
            False,
            f'Annotation with code title "{obj.code.name}", code description "{obj.code.description}" and the following content: {obj.span_text.text}',
        )
