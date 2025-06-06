from typing import Tuple, Union

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.image_captioning_prompt import IMG_CAPTION_USER_PROMPT
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.repo.repo_service import RepoService
from app.core.data.repo.utils import image_to_base64, load_image
from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session


class OllamaMemoResult(BaseModel):
    memo: str


def summarize_sdoc(
    obj: SourceDocumentORM,
    db: Session,
) -> Tuple[bool, str]:
    sdoc_data = crud_sdoc.read_data(db=db, id=obj.id)
    if sdoc_data is None:
        raise ValueError("SourceDocumentData not found")
    if obj.doctype == DocType.text:
        return False, "".join(sdoc_data.sentences)
    elif obj.doctype == DocType.image:
        path = RepoService().get_path_to_sdoc_file(
            sdoc=SourceDocumentRead.model_validate(obj),
            webp=False,
            thumbnail=False,
        )
        image = load_image(path)
        base64_image = image_to_base64(image)
        return True, base64_image
    else:
        raise NotImplementedError(f"Can't summarize this DocType: {obj.doctype}")


def summarize_document_tag(
    obj: DocumentTagORM,
    db=None,
) -> Tuple[bool, str]:
    return (
        False,
        f'Document Tag with name "{obj.name}" and description "{obj.description}"',
    )


def summarize_code(
    obj: CodeORM,
    db: Session,
) -> Tuple[bool, str]:
    return (
        False,
        f'Code used for classification with name "{obj.name}" and description "{obj.description}"',
    )


def summarize_project(
    obj: ProjectORM,
    db=None,
) -> Tuple[bool, str]:
    return (
        False,
        f'Project with title "{obj.title}" and description "{obj.description}"',
    )


def summarize_bbox_anno(
    obj: BBoxAnnotationORM,
    db: Session,
) -> Tuple[bool, str]:
    path = RepoService().get_path_to_sdoc_file(
        sdoc=SourceDocumentRead.model_validate(obj.annotation_document.source_document),
        webp=False,
        thumbnail=False,
    )
    image = load_image(path)
    cropped_image = image.crop((obj.x_min, obj.y_min, obj.x_max, obj.y_max))
    cropped_image_b64 = image_to_base64(cropped_image)
    return True, cropped_image_b64


def summarize_sent_anno(
    obj: SentenceAnnotationORM,
    db: Session,
) -> Tuple[bool, str]:
    sdoc_data = crud_sdoc.read_data(
        db=db, id=obj.annotation_document.source_document_id
    )
    return (
        False,
        f'Annotation with code title "{obj.code.name}", code description "{obj.code.description}" and the following content: {sdoc_data.sentences[obj.sentence_id_start : obj.sentence_id_end + 1]}',
    )


def summarize_span_anno(
    obj: SpanAnnotationORM,
    db=None,
) -> Tuple[bool, str]:
    return (
        False,
        f'Annotation with code title "{obj.code.name}", code description "{obj.code.description}" and the following content: {obj.span_text.text}',
    )


def summarize_span_group(
    obj: SpanGroupORM,
    db=None,
) -> Tuple[bool, str]:
    raise NotImplementedError(f"AttachedObjectType is not supported: {type(obj)}")


SUMMARY_FUNCTIONS = {
    SourceDocumentORM: summarize_sdoc,
    DocumentTagORM: summarize_document_tag,
    CodeORM: summarize_code,
    ProjectORM: summarize_project,
    BBoxAnnotationORM: summarize_bbox_anno,
    SentenceAnnotationORM: summarize_sent_anno,
    SpanAnnotationORM: summarize_span_anno,
    SpanGroupORM: summarize_span_group,
}
MEMO_GEN_PROMPT = "Don't use imperative form. Generate a concise, 1-2 sentence helpful memo about the following object:\n\n{obj_summary}"


def generate_memo_ollama(
    obj: Union[
        SourceDocumentORM,
        DocumentTagORM,
        CodeORM,
        ProjectORM,
        BBoxAnnotationORM,
        SentenceAnnotationORM,
        SpanAnnotationORM,
        SpanGroupORM,
    ],
    db: Session,
) -> str:
    # 1. Update job description
    msg = "Started Memo Generation (OLLAMA)"
    logger.info(msg)
    # 2. Build the prompt for the memo suggestion
    summary_fn = SUMMARY_FUNCTIONS.get(type(obj))
    if summary_fn is not None:
        isImage, obj_summary = summary_fn(obj, db)
    else:
        raise NotImplementedError(f"AttachedObjectType is not supported: {type(obj)}")

    # 3. Send to Ollama for processing
    if isImage:
        caption, _ = OllamaService().vlm_chat(
            user_prompt=IMG_CAPTION_USER_PROMPT, b64_images=[obj_summary]
        )
        return caption.strip()
    else:
        response = OllamaService().llm_chat(
            system_prompt="You are a helpful assistant generating memos.",
            user_prompt=MEMO_GEN_PROMPT.format(obj_summary=obj_summary),
            response_model=OllamaMemoResult,
        )
        logger.info(f"Got chat response for object ID {obj.id}! Response={response}")

        return response.memo.strip()
