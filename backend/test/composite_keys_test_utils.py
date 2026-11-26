from typing import TypedDict, TypeVar

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from common.sdoc_status_enum import SDocStatus
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.annotation.span_group_orm import (
    SpanAnnotationSpanGroupLinkTable,
    SpanGroupORM,
)
from core.annotation.span_text_orm import SpanTextORM
from core.artefacts.word_frequencies.word_frequency_orm import WordFrequencyORM
from core.code.code_orm import CodeORM
from core.doc.folder_enum import FolderType
from core.doc.folder_orm import FolderORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_orm import MemoFavoriteLinkTable, MemoORM, MemoRecentORM
from core.memo.object_handle_orm import ObjectHandleORM
from core.metadata.project_metadata_orm import ProjectMetadataORM
from core.metadata.source_document_metadata_orm import SourceDocumentMetadataORM
from core.project.project_orm import ProjectORM
from core.prompt.prompt_enum import PromptLanguage, TaskType
from core.prompt.prompt_orm import PromptORM, PromptVersionORM
from core.tag.tag_orm import SourceDocumentTagLinkTable, TagORM
from core.user.user_orm import UserORM
from feature_test_utils import create_project_with_features
from modules.classifier.classifier_enum import ClassifierModel
from modules.classifier.classifier_orm import (
    ClassifierCodeLinkTable,
    ClassifierEvaluationORM,
    ClassifierORM,
    ClassifierTagLinkTable,
)
from modules.concept_over_time_analysis.cota_orm import ConceptOverTimeAnalysisORM
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.perspectives.aspect_orm import AspectORM
from modules.perspectives.cluster_orm import ClusterORM
from modules.perspectives.document_aspect_orm import DocumentAspectORM
from modules.perspectives.document_cluster_orm import DocumentClusterORM
from modules.search_view.search_view_orm import SearchViewORM
from modules.tag_recommendation.tag_recommendation_orm import TagRecommendationLinkORM
from modules.timeline_analysis.timeline_analysis_enum import TimelineAnalysisType
from modules.timeline_analysis.timeline_analysis_orm import TimelineAnalysisORM
from modules.whiteboard.whiteboard_orm import WhiteboardORM
from systems.artefact_system.source_document_step_status_orm import (
    SourceDocumentStepStatusORM,
)
from systems.job_system.job_system_enum import JobStatus

# the tables that got a project_id column with the composite keys, and objecthandle,
# whose project_id became the project the handle belongs to
FILLED_TABLES = [
    "annotationdocument",
    "classifiercodelinktable",
    "classifierevaluation",
    "classifiertaglinktable",
    "cluster",
    "documentaspect",
    "documentcluster",
    "experimentrun",
    "memofavoritelinktable",
    "memorecent",
    "objecthandle",
    "promptversion",
    "sourcedocumentdata",
    "sourcedocumentmetadata",
    "sourcedocumentstepstatus",
    "sourcedocumenttaglinktable",
    "spanannotationspangrouplinktable",
    "spangroup",
    "tagrecommendationlink",
    "wordfrequency",
]


class TenantRows(TypedDict):
    """One row of every project-owned table with a project-owned parent, all in
    `project`. Built from ORM objects with their id columns (never by assigning
    relationship objects):

    - folders "Folder <p>" (sdoc folder) and "Child folder <p>" below it
    - document "doc_<p>.txt" in "Folder <p>" with its data row, the metadata
      "key_<p>" (string value "value"), the word frequency "word" (count 1) and
      the step status "word_frequency" (finished); the document "bare_<p>.txt"
      in the same folder has none of these
    - codes "Code <p>" and "Child code <p>" below it, tags "Tag <p>" and
      "Child tag <p>" below it; the document is linked to "Tag <p>"
    - the annotation document of `user` for the document, holding a span, a
      sentence and a bounding box annotation of "Code <p>" and the span group
      "Group <p>" that contains the span annotation
    - the object handle of "Code <p>" with the memos "Memo <p>", which `user`
      favorited and opened, and "Bare memo <p>", both of `user`; "Child code <p>"
      has no handle
    - prompt "Prompt <p>" with version 1 and "Bare prompt <p>" without versions, experiment "Experiment <p>" (on the
      document and "Code <p>") with run "Run <p>" of that version (virtual user:
      `user`)
    - classifier "Classifier <p>" linked to "Code <p>" and "Tag <p>", with one
      evaluation
    - aspect "Aspect <p>" of "Tag <p>" with cluster "Cluster <p>" and its child
      "Child cluster <p>"; the document has a document aspect and is in the
      cluster
    - a tag recommendation of "Tag <p>" for the document
    - the analyses without project-owned parent: whiteboard "Whiteboard <p>",
      timeline analysis "Timeline <p>" (documents) and concept over time
      analysis "COTA <p>", each empty
    - the memo search view "View <p>" of `user` (table layout, empty filter)

    `<p>` is the project id.
    """

    project: ProjectORM
    folder: FolderORM
    child_folder: FolderORM
    sdoc: SourceDocumentORM
    bare_sdoc: SourceDocumentORM
    sdoc_data: SourceDocumentDataORM
    project_metadata: ProjectMetadataORM
    sdoc_metadata: SourceDocumentMetadataORM
    word_frequency: WordFrequencyORM
    step_status: SourceDocumentStepStatusORM
    code: CodeORM
    child_code: CodeORM
    tag: TagORM
    child_tag: TagORM
    adoc: AnnotationDocumentORM
    span: SpanAnnotationORM
    sentence: SentenceAnnotationORM
    bbox: BBoxAnnotationORM
    span_group: SpanGroupORM
    handle: ObjectHandleORM
    memo: MemoORM
    bare_memo: MemoORM
    memo_recent: MemoRecentORM
    prompt: PromptORM
    bare_prompt: PromptORM
    prompt_version: PromptVersionORM
    experiment: ExperimentORM
    experiment_run: ExperimentRunORM
    classifier: ClassifierORM
    classifier_evaluation: ClassifierEvaluationORM
    aspect: AspectORM
    cluster: ClusterORM
    child_cluster: ClusterORM
    document_aspect: DocumentAspectORM
    document_cluster: DocumentClusterORM
    tag_recommendation: TagRecommendationLinkORM
    whiteboard: WhiteboardORM
    timeline_analysis: TimelineAnalysisORM
    cota: ConceptOverTimeAnalysisORM
    search_view: SearchViewORM


T = TypeVar("T")


def _add(db: Session, obj: T) -> T:
    db.add(obj)
    db.flush()
    return obj


def create_tenant_rows(
    db: Session, *, project: ProjectORM, user: UserORM
) -> TenantRows:
    p = project.id
    folder = _add(
        db,
        FolderORM(name=f"Folder {p}", folder_type=FolderType.SDOC_FOLDER, project_id=p),
    )
    child_folder = _add(
        db,
        FolderORM(
            name=f"Child folder {p}",
            folder_type=FolderType.NORMAL,
            project_id=p,
            parent_id=folder.id,
        ),
    )
    sdoc = _add(
        db,
        SourceDocumentORM(
            filename=f"doc_{p}.txt",
            name=f"doc_{p}",
            doctype=DocType.text,
            project_id=p,
            folder_id=folder.id,
        ),
    )
    bare_sdoc = _add(
        db,
        SourceDocumentORM(
            filename=f"bare_{p}.txt",
            name=f"bare_{p}",
            doctype=DocType.text,
            project_id=p,
            folder_id=folder.id,
        ),
    )
    sdoc_data = _add(
        db,
        SourceDocumentDataORM(
            id=sdoc.id,
            project_id=p,
            content="Alpha beta.",
            raw_html="<p>Alpha beta.</p>",
            html="<p>Alpha beta.</p>",
            token_starts=[0, 6],
            token_ends=[5, 10],
            sentence_starts=[0],
            sentence_ends=[11],
        ),
    )
    project_metadata = _add(
        db,
        ProjectMetadataORM(
            key=f"key_{p}",
            metatype=MetaType.STRING,
            read_only=False,
            doctype=DocType.text,
            description="",
            project_id=p,
        ),
    )
    sdoc_metadata = _add(
        db,
        SourceDocumentMetadataORM(
            str_value="value",
            project_id=p,
            project_metadata_id=project_metadata.id,
            source_document_id=sdoc.id,
        ),
    )
    word_frequency = _add(
        db, WordFrequencyORM(project_id=p, sdoc_id=sdoc.id, word="word", count=1)
    )
    step_status = _add(
        db,
        SourceDocumentStepStatusORM(
            project_id=p,
            sdoc_id=sdoc.id,
            step="word_frequency",
            status=SDocStatus.finished,
        ),
    )
    code = _add(
        db,
        CodeORM(
            name=f"Code {p}",
            description="",
            color="#000000",
            is_system=False,
            enabled=True,
            project_id=p,
        ),
    )
    child_code = _add(
        db,
        CodeORM(
            name=f"Child code {p}",
            description="",
            color="#000000",
            is_system=False,
            enabled=True,
            project_id=p,
            parent_id=code.id,
        ),
    )
    tag = _add(db, TagORM(name=f"Tag {p}", color="#000000", project_id=p))
    child_tag = _add(
        db,
        TagORM(name=f"Child tag {p}", color="#000000", project_id=p, parent_id=tag.id),
    )
    _add(
        db,
        SourceDocumentTagLinkTable(
            project_id=p, source_document_id=sdoc.id, tag_id=tag.id
        ),
    )
    adoc = _add(
        db,
        AnnotationDocumentORM(
            project_id=p, source_document_id=sdoc.id, user_id=user.id
        ),
    )
    span_text = _add(db, SpanTextORM(text=f"Alpha {p}"))
    span = _add(
        db,
        SpanAnnotationORM(
            uuid=f"span-{p}",
            begin=0,
            end=5,
            begin_token=0,
            end_token=1,
            project_id=p,
            code_id=code.id,
            annotation_document_id=adoc.id,
            span_text_id=span_text.id,
        ),
    )
    sentence = _add(
        db,
        SentenceAnnotationORM(
            uuid=f"sentence-{p}",
            sentence_id_start=0,
            sentence_id_end=0,
            project_id=p,
            code_id=code.id,
            annotation_document_id=adoc.id,
        ),
    )
    bbox = _add(
        db,
        BBoxAnnotationORM(
            uuid=f"bbox-{p}",
            x_min=0,
            x_max=1,
            y_min=0,
            y_max=1,
            project_id=p,
            code_id=code.id,
            annotation_document_id=adoc.id,
        ),
    )
    span_group = _add(
        db,
        SpanGroupORM(name=f"Group {p}", project_id=p, annotation_document_id=adoc.id),
    )
    _add(
        db,
        SpanAnnotationSpanGroupLinkTable(
            project_id=p, span_annotation_id=span.id, span_group_id=span_group.id
        ),
    )
    handle = _add(db, ObjectHandleORM(project_id=p, code_id=code.id))
    memo = _add(
        db,
        MemoORM(
            uuid=f"memo-{p}",
            title=f"Memo {p}",
            content="",
            content_json="",
            attached_to_id=handle.id,
            project_id=p,
            user_id=user.id,
        ),
    )
    bare_memo = _add(
        db,
        MemoORM(
            uuid=f"bare-memo-{p}",
            title=f"Bare memo {p}",
            content="",
            content_json="",
            attached_to_id=handle.id,
            project_id=p,
            user_id=user.id,
        ),
    )
    _add(db, MemoFavoriteLinkTable(project_id=p, memo_id=memo.id, user_id=user.id))
    memo_recent = _add(
        db, MemoRecentORM(project_id=p, memo_id=memo.id, user_id=user.id)
    )
    prompt = _add(
        db,
        PromptORM(
            name=f"Prompt {p}",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            project_id=p,
        ),
    )
    bare_prompt = _add(
        db,
        PromptORM(
            name=f"Bare prompt {p}",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            project_id=p,
        ),
    )
    prompt_version = _add(
        db,
        PromptVersionORM(
            version=1,
            text="",
            settings={},
            codes=[],
            examples=[],
            tags=[],
            metadata_fields=[],
            project_id=p,
            prompt_id=prompt.id,
        ),
    )
    experiment = _add(
        db,
        ExperimentORM(
            name=f"Experiment {p}",
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[sdoc.id],
            code_ids=[code.id],
            project_id=p,
        ),
    )
    experiment_run = _add(
        db,
        ExperimentRunORM(
            name=f"Run {p}",
            model="model",
            sdoc_ids=[sdoc.id],
            status=JobStatus.FINISHED,
            project_id=p,
            experiment_id=experiment.id,
            prompt_version_id=prompt_version.id,
            virtual_user_id=user.id,
        ),
    )
    classifier = _add(
        db,
        ClassifierORM(
            name=f"Classifier {p}",
            base_model="model",
            type=ClassifierModel.DOCUMENT,
            labelid2classid={},
            train_params={},
            train_loss=[],
            train_data_stats=[],
            project_id=p,
        ),
    )
    _add(
        db,
        ClassifierCodeLinkTable(
            project_id=p, classifier_id=classifier.id, code_id=code.id
        ),
    )
    _add(
        db,
        ClassifierTagLinkTable(
            project_id=p, classifier_id=classifier.id, tag_id=tag.id
        ),
    )
    classifier_evaluation = _add(
        db,
        ClassifierEvaluationORM(
            f1=1.0,
            precision=1.0,
            recall=1.0,
            accuracy=1.0,
            eval_data_stats=[],
            project_id=p,
            classifier_id=classifier.id,
        ),
    )
    aspect = _add(
        db,
        AspectORM(
            name=f"Aspect {p}",
            doc_embedding_prompt="",
            is_hierarchical=False,
            project_id=p,
            tag_id=tag.id,
        ),
    )
    cluster = _add(
        db,
        ClusterORM(
            name=f"Cluster {p}",
            is_outlier=False,
            level=0,
            project_id=p,
            aspect_id=aspect.id,
        ),
    )
    child_cluster = _add(
        db,
        ClusterORM(
            name=f"Child cluster {p}",
            is_outlier=False,
            level=1,
            project_id=p,
            aspect_id=aspect.id,
            parent_cluster_id=cluster.id,
        ),
    )
    document_aspect = _add(
        db,
        DocumentAspectORM(
            project_id=p, sdoc_id=sdoc.id, aspect_id=aspect.id, content=""
        ),
    )
    document_cluster = _add(
        db,
        DocumentClusterORM(project_id=p, sdoc_id=sdoc.id, cluster_id=cluster.id),
    )
    tag_recommendation = _add(
        db,
        TagRecommendationLinkORM(
            project_id=p, source_document_id=sdoc.id, predicted_tag_id=tag.id
        ),
    )
    return {
        "project": project,
        "folder": folder,
        "child_folder": child_folder,
        "sdoc": sdoc,
        "bare_sdoc": bare_sdoc,
        "sdoc_data": sdoc_data,
        "project_metadata": project_metadata,
        "sdoc_metadata": sdoc_metadata,
        "word_frequency": word_frequency,
        "step_status": step_status,
        "code": code,
        "child_code": child_code,
        "tag": tag,
        "child_tag": child_tag,
        "adoc": adoc,
        "span": span,
        "sentence": sentence,
        "bbox": bbox,
        "span_group": span_group,
        "handle": handle,
        "memo": memo,
        "bare_memo": bare_memo,
        "memo_recent": memo_recent,
        "prompt": prompt,
        "bare_prompt": bare_prompt,
        "prompt_version": prompt_version,
        "experiment": experiment,
        "experiment_run": experiment_run,
        "classifier": classifier,
        "classifier_evaluation": classifier_evaluation,
        "aspect": aspect,
        "cluster": cluster,
        "child_cluster": child_cluster,
        "document_aspect": document_aspect,
        "document_cluster": document_cluster,
        "tag_recommendation": tag_recommendation,
        "whiteboard": _add(db, WhiteboardORM(title=f"Whiteboard {p}", project_id=p)),
        "timeline_analysis": _add(
            db,
            TimelineAnalysisORM(
                name=f"Timeline {p}",
                timeline_analysis_type=TimelineAnalysisType.DOCUMENT,
                project_id=p,
            ),
        ),
        "cota": _add(db, ConceptOverTimeAnalysisORM(name=f"COTA {p}", project_id=p)),
        "search_view": _add(
            db,
            SearchViewORM(
                name=f"View {p}",
                entity_type="memo",
                layout="table",
                filters={"id": "root", "logic_operator": "and", "items": []},
                position=0,
                project_id=p,
                user_id=user.id,
            ),
        ),
    }


class TwoTenants(TypedDict):
    """The rows of `create_tenant_rows` (see TenantRows) in two projects of the
    user: `own` in the given project and `foreign` in the project "Foreign
    Project" (no features). The user annotated, wrote and favorited in both and
    is a member of both."""

    own: TenantRows
    foreign: TenantRows


def create_two_tenants(
    db: Session, *, user: UserORM, project: ProjectORM
) -> TwoTenants:
    foreign_project = create_project_with_features(
        db, user, title="Foreign Project", features=[]
    )
    own = create_tenant_rows(db, project=project, user=user)
    foreign = create_tenant_rows(db, project=foreign_project, user=user)
    db.commit()
    return {"own": own, "foreign": foreign}
