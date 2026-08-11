from collections.abc import Iterable
from pathlib import Path
from typing import TypedDict, cast

import pytest
from datasets import load_dataset

from common.doc_type import DocType
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import SpanAnnotationCreate
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderCreate, FolderType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.tag.tag_orm import TagORM
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import ClassifierCreate, ClassifierModel
from repos.filesystem_repo import FilesystemRepo

# ---------------------------------------------------------------------------
# TEXT SDOC IMPORT HELPER
# ---------------------------------------------------------------------------


def __whitespace_tokenize(text: str) -> tuple[list[int], list[int]]:
    """Compute token start/end character offsets via whitespace tokenization."""
    token_starts: list[int] = []
    token_ends: list[int] = []
    i = 0
    n = len(text)
    while i < n:
        while i < n and text[i].isspace():
            i += 1
        if i >= n:
            break
        start = i
        while i < n and not text[i].isspace():
            i += 1
        token_starts.append(start)
        token_ends.append(i)
    return token_starts, token_ends


def _create_dataset_folder(db_session, project: ProjectORM, name: str) -> int:
    """Create a single top-level SDOC_FOLDER that holds all sdocs of a dataset.

    Returns the folder id. The folder is a sibling of the project root's
    children (parent_id=None), not the project root itself.
    """
    folder = crud_folder.create(
        db=db_session,
        create_dto=FolderCreate(
            name=name,
            folder_type=FolderType.SDOC_FOLDER,
            parent_id=None,
            project_id=project.id,
        ),
    )
    return folder.id


def _import_text_sdocs(
    db_session,
    project: ProjectORM,
    folder_id: int,
    docs: list[tuple[str, str, str | list[str]]],
) -> list[SourceDocumentORM]:
    """Bulk-create text source documents and their data with computed offsets.

    `docs` is a list of (filename, name, content) triples. If a content item is
    a list of strings, it is treated as sentences joined by single spaces and
    sentence offsets are computed exactly; otherwise the whole content is
    treated as a single sentence. All sdocs are placed in `folder_id`.

    Returns the created SourceDocumentORMs in the same order as `docs`.
    """
    # 1. Bulk-create the source documents (single flush).
    sdoc_dtos = [
        SourceDocumentCreate(
            filename=filename,
            name=name,
            doctype=DocType.text,
            project_id=project.id,
            folder_id=folder_id,
        )
        for filename, name, _ in docs
    ]
    sdocs = crud_sdoc.create_multi(db=db_session, create_dtos=sdoc_dtos)

    # 2. Build sdoc_data rows. Classifier tests read content from PostgreSQL,
    # so creating thousands of duplicate files would only add test overhead.
    fsr = FilesystemRepo()
    data_dtos: list[SourceDocumentDataCreate] = []
    for sdoc, (_, _, content) in zip(sdocs, docs):
        sentences: list[str] | None = None
        if isinstance(content, list):
            sentences = content
            content = " ".join(sentences)

        token_starts, token_ends = __whitespace_tokenize(content)

        if sentences is not None:
            sentence_starts: list[int] = []
            sentence_ends: list[int] = []
            cursor = 0
            for sent in sentences:
                idx = content.index(sent, cursor)
                sentence_starts.append(idx)
                sentence_ends.append(idx + len(sent))
                cursor = idx + len(sent)
        else:
            sentence_starts = [0]
            sentence_ends = [len(content)]

        file_path = fsr._get_dst_path_for_project_sdoc_file(
            proj_id=project.id, filename=sdoc.filename
        )
        relative_file_path = file_path.relative_to(fsr.root_dir)
        data_dtos.append(
            SourceDocumentDataCreate(
                id=sdoc.id,
                content=content,
                repo_url=str(relative_file_path),
                raw_html=f"<p>{content}</p>",
                html=f"<p>{content}</p>",
                token_starts=token_starts,
                token_ends=token_ends,
                sentence_starts=sentence_starts,
                sentence_ends=sentence_ends,
                token_time_starts=None,
                token_time_ends=None,
            )
        )

    # 3. Bulk-create the sdoc_data rows (single flush).
    crud_sdoc_data.create_multi(db=db_session, create_dtos=data_dtos)

    return sdocs


# ---------------------------------------------------------------------------
# PERSISTED CLASSIFIER ROW
# ---------------------------------------------------------------------------


class PersistedClassifier(TypedDict):
    classifier_id: int
    model_dir: Path


@pytest.fixture(scope="function")
def persisted_classifier(db_session, test_project) -> PersistedClassifier:
    """Persist a minimal ClassifierORM row with a dummy on-disk model dir."""
    model_dir = Path(
        FilesystemRepo().get_model_dir(
            proj_id=test_project.id,
            model_name="testclf",
            model_prefix="test_classifier_",
        )
    )
    model_dir.mkdir(parents=True, exist_ok=True)
    checkpoint = model_dir / "checkpoint.ckpt"
    checkpoint.write_text("dummy")

    clf = crud_classifier.create(
        db=db_session,
        create_dto=ClassifierCreate(
            project_id=test_project.id,
            name="Test Classifier",
            base_model="test-base",
            type=ClassifierModel.SPAN,
            path=str(checkpoint),
            labelid2classid={0: 0},
            train_params={},
            train_loss=[],
            train_data_stats=[],
        ),
        codes=[],
        tags=[],
    )
    db_session.commit()
    return {"classifier_id": clf.id, "model_dir": model_dir}


# ---------------------------------------------------------------------------
# TRAIN / EVAL / TEST SUBSET TAGS
# ---------------------------------------------------------------------------

# The classifier services select documents via crud_sdoc.read_by_tags, so the
# fixtures tag every imported sdoc with exactly one of these subset tags,
# mirroring a typical frontend workflow: train on `training-data`, evaluate on
# `evaluation-data`, run inference on `test-data`.
TRAIN_TAG_NAME = "training-data"
EVAL_TAG_NAME = "evaluation-data"
TEST_TAG_NAME = "test-data"


class SubsetTags(TypedDict):
    train: TagORM
    eval: TagORM
    test: TagORM


def _create_subset_tags(db_session, project: ProjectORM) -> SubsetTags:
    """Create the training-data / evaluation-data / test-data tags."""
    return {
        "train": crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name=TRAIN_TAG_NAME,
                description="Subset used for training",
                project_id=project.id,
            ),
        ),
        "eval": crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name=EVAL_TAG_NAME,
                description="Subset used for evaluation",
                project_id=project.id,
            ),
        ),
        "test": crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name=TEST_TAG_NAME,
                description="Subset used for inference",
                project_id=project.id,
            ),
        ),
    }


def _link_subset_tags(
    db_session, sdoc_ids: list[int], tags: SubsetTags
) -> dict[str, list[int]]:
    """Split sdoc_ids deterministically into train/eval/test thirds and tag them.

    Round-robin assignment (every 3rd sdoc goes to eval/test) keeps every
    class represented in every subset. Returns the subset -> sdoc_ids mapping.
    """
    subsets = {"train": [], "eval": [], "test": []}
    for i, sdoc_id in enumerate(sdoc_ids):
        subsets[("train", "eval", "test")[i % 3]].append(sdoc_id)
    for name, ids in subsets.items():
        crud_tag.link_multiple_tags(
            db=db_session, sdoc_ids=ids, tag_ids=[tags[name].id]
        )
    return subsets


# ---------------------------------------------------------------------------
# SPAN DATASET (CoNLL 2003 NER)
# ---------------------------------------------------------------------------

CONLL_LABEL2ID = {
    "O": 0,
    "B-PER": 1,
    "I-PER": 2,
    "B-ORG": 3,
    "I-ORG": 4,
    "B-LOC": 5,
    "I-LOC": 6,
    "B-MISC": 7,
    "I-MISC": 8,
}
CONLL_ID2LABEL = {v: k for k, v in CONLL_LABEL2ID.items()}
CONLL_ENTITY_TYPES = ["PER", "ORG", "LOC", "MISC"]
# Code names are prefixed because DATS projects already contain system codes
# named PER / ORG / LOC / MISC, and code names are unique per project.
CONLL_CODE_PREFIX = "conll-"


class ConllDatasetRow(TypedDict):
    tokens: list[str]
    ner_tags: list[int]


class SpanDataset(TypedDict):
    project: ProjectORM
    codes: dict[str, CodeORM]
    tags: SubsetTags
    subset2sdoc_ids: dict[str, list[int]]


def _create_span_dto(sdoc, tokens, start, end_exclusive, code) -> SpanAnnotationCreate:
    """Build a SpanAnnotationCreate for the token range [start, end_exclusive).

    `end_exclusive` follows Python slice semantics: the span covers
    tokens[start:end_exclusive], i.e. the last covered token is
    end_exclusive - 1. This matches SpanAnnotation.end_token semantics in
    DATS, where end_token is exclusive (see span_class_model_service.py,
    which resolves end_char via token_ends[end_token - 1] and slices labels
    as labels[begin_token:end_token]).

    Character offsets are computed under the fixture's whitespace-join
    convention: content == " ".join(tokens), so token i starts at
    len(" ".join(tokens[:i])) + (1 if i > 0 else 0).
    """
    span_tokens = tokens[start:end_exclusive]
    span_text = " ".join(span_tokens)
    # character offsets within the joined content
    begin_char = len(" ".join(tokens[:start])) + (1 if start > 0 else 0)
    end_char = begin_char + len(span_text)
    return SpanAnnotationCreate(
        span_text=span_text,
        begin=begin_char,
        end=end_char,
        begin_token=start,
        end_token=end_exclusive,
        code_id=code.id,
        sdoc_id=sdoc.id,
    )


@pytest.fixture(scope="function")
def span_statistics_dataset(db_session, test_project, test_user) -> SpanDataset:
    """Create four tagged documents with deterministic span annotations.

    The fixture creates one 10-token document for each class: PER, ORG, LOC,
    and MISC. ``test_user`` annotates the first token of the PER document, the
    first two tokens of the ORG document, the first three tokens of the LOC
    document, and the first four tokens of the MISC document. Across all four
    documents, the complete fixture therefore contains 40 tokens, of which 10
    are annotated.

    Every document receives exactly one of the training-data, evaluation-data,
    or test-data tags through deterministic round-robin assignment. The returned
    ``subset2sdoc_ids`` maps those subset names to their document IDs.
    """
    codes = {
        entity_type: crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=f"{CONLL_CODE_PREFIX}{entity_type}",
                description=f"Synthetic entity type {entity_type}",
                parent_id=None,
                enabled=True,
                project_id=test_project.id,
                is_system=False,
            ),
        )
        for entity_type in CONLL_ENTITY_TYPES
    }
    folder_id = _create_dataset_folder(db_session, test_project, "span-statistics")
    tokens = [
        "alpha",
        "beta",
        "gamma",
        "delta",
        "epsilon",
        "zeta",
        "eta",
        "theta",
        "iota",
        "kappa",
    ]
    sdocs = _import_text_sdocs(
        db_session,
        test_project,
        folder_id,
        [
            (f"span_stats_{i}.txt", f"Span statistics {i}", " ".join(tokens))
            for i in range(len(CONLL_ENTITY_TYPES))
        ],
    )
    span_dtos = [
        _create_span_dto(sdoc, tokens, 0, i + 1, codes[entity_type])
        for i, (sdoc, entity_type) in enumerate(zip(sdocs, CONLL_ENTITY_TYPES))
    ]
    crud_span_anno.create_bulk(
        db=db_session,
        user_id=test_user.id,
        create_dtos=span_dtos,
    )
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(
        db_session,
        [sdoc.id for sdoc in sdocs],
        subset_tags,
    )
    db_session.commit()
    return {
        "project": test_project,
        "codes": codes,
        "tags": subset_tags,
        "subset2sdoc_ids": subsets,
    }


@pytest.fixture(scope="function")
def conll_span_dataset(db_session, test_project, test_user) -> SpanDataset:
    """Import the full CoNLL-2003 training split as span annotations (one sdoc per sentence).

    Sdocs are split into train/eval/test thirds tagged training-data /
    evaluation-data / test-data; `subset2sdoc_ids` maps subset name -> sdoc ids.
    """
    ds = load_dataset("BramVanroy/conll2003", split="train")

    # Fail loudly if the dataset's label schema drifts from our constants
    dataset_label_names: list[str] = ds.features["ner_tags"].feature.names
    assert CONLL_ID2LABEL == dict(enumerate(dataset_label_names)), (
        f"CoNLL label schema changed, update CONLL_LABEL2ID: {dataset_label_names}"
    )
    dataset_entity_types = sorted(
        {name[2:] for name in dataset_label_names if name != "O"}
    )
    assert dataset_entity_types == sorted(CONLL_ENTITY_TYPES), (
        f"CoNLL entity types changed, update CONLL_ENTITY_TYPES: {dataset_entity_types}"
    )

    # 1. Create codes (one per entity type)
    codes: dict[str, CodeORM] = {}
    for entity_type in CONLL_ENTITY_TYPES:
        codes[entity_type] = crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=f"{CONLL_CODE_PREFIX}{entity_type}",
                description=f"CoNLL entity type {entity_type}",
                parent_id=None,
                enabled=True,
                project_id=test_project.id,
                is_system=False,
            ),
        )

    # 2. Create dataset folder
    folder_id = _create_dataset_folder(db_session, test_project, "conll2003")

    # 3. Import docs (one sdoc per sentence)
    docs: list[tuple[str, str, str | list[str]]] = []
    examples: list[tuple[list[str], list[int]]] = []
    for i, row in enumerate(cast(Iterable[ConllDatasetRow], ds)):
        tokens: list[str] = row["tokens"]
        docs.append((f"conll_{i}.txt", f"CoNLL {i}", " ".join(tokens)))
        examples.append((tokens, row["ner_tags"]))
    sdocs = _import_text_sdocs(db_session, test_project, folder_id, docs)
    sdoc_ids = [sdoc.id for sdoc in sdocs]

    # 4. Create span annotations (BIO -> contiguous spans)
    span_dtos: list[SpanAnnotationCreate] = []
    for sdoc, (tokens, tags) in zip(sdocs, examples):
        # Convert BIO tags to contiguous spans (token indices)
        start: int | None = None
        current_type: str | None = None
        for idx, tag_id in enumerate(tags + [0]):  # sentinel to flush
            label = CONLL_ID2LABEL[tag_id]
            if label.startswith("B-"):
                if start is not None and current_type in codes:
                    span_dtos.append(
                        _create_span_dto(sdoc, tokens, start, idx, codes[current_type])
                    )
                start = idx
                current_type = label[2:]
            elif label.startswith("I-"):
                pass  # continuation
            else:  # O
                if start is not None and current_type in codes:
                    span_dtos.append(
                        _create_span_dto(sdoc, tokens, start, idx, codes[current_type])
                    )
                start = None
                current_type = None

    crud_span_anno.create_bulk(
        db=db_session, user_id=test_user.id, create_dtos=span_dtos
    )

    # 5. Create subset tags + split sdocs into train/eval/test subsets
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(db_session, sdoc_ids, subset_tags)
    db_session.commit()
    return {
        "project": test_project,
        "codes": codes,
        "tags": subset_tags,
        "subset2sdoc_ids": subsets,
    }


# ---------------------------------------------------------------------------
# DOCUMENT DATASET (20 Newsgroups)
# ---------------------------------------------------------------------------

NEWS20_CATEGORIES = [
    "alt.atheism",
    "comp.graphics",
    "comp.os.ms-windows.misc",
    "comp.sys.ibm.pc.hardware",
    "comp.sys.mac.hardware",
    "comp.windows.x",
    "misc.forsale",
    "rec.autos",
    "rec.motorcycles",
    "rec.sport.baseball",
    "rec.sport.hockey",
    "sci.crypt",
    "sci.electronics",
    "sci.med",
    "sci.space",
    "soc.religion.christian",
    "talk.politics.guns",
    "talk.politics.mideast",
    "talk.politics.misc",
    "talk.religion.misc",
]


class News20DatasetRow(TypedDict):
    label_text: str
    text: str


class DocDataset(TypedDict):
    project: ProjectORM
    tags: dict[str, TagORM]
    subset_tags: SubsetTags
    subset2sdoc_ids: dict[str, list[int]]
    category2sdoc_ids: dict[str, list[int]]


@pytest.fixture(scope="function")
def document_statistics_dataset(db_session, test_project) -> DocDataset:
    """Create 20 tagged documents with deterministic document classes.

    The fixture creates one document for every category in
    ``NEWS20_CATEGORIES``. Each document carries exactly one category tag, so the
    complete fixture contains 20 document units and all 20 are labeled.

    Every document also receives exactly one of the training-data,
    evaluation-data, or test-data tags through deterministic round-robin
    assignment. The returned mappings provide the document IDs grouped by
    subset and by category.
    """
    tags = {
        category: crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name=category,
                description=f"Synthetic 20NG category {category}",
                project_id=test_project.id,
            ),
        )
        for category in NEWS20_CATEGORIES
    }
    folder_id = _create_dataset_folder(db_session, test_project, "document-statistics")
    sdocs = _import_text_sdocs(
        db_session,
        test_project,
        folder_id,
        [
            (
                f"document_stats_{i}.txt",
                f"Document statistics {category}",
                f"Synthetic document for category {category}.",
            )
            for i, category in enumerate(NEWS20_CATEGORIES)
        ],
    )
    for sdoc, category in zip(sdocs, NEWS20_CATEGORIES):
        crud_tag.link_multiple_tags(
            db=db_session,
            sdoc_ids=[sdoc.id],
            tag_ids=[tags[category].id],
        )
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(
        db_session,
        [sdoc.id for sdoc in sdocs],
        subset_tags,
    )
    db_session.commit()
    return {
        "project": test_project,
        "tags": tags,
        "subset_tags": subset_tags,
        "subset2sdoc_ids": subsets,
        "category2sdoc_ids": {
            category: [sdoc.id] for category, sdoc in zip(NEWS20_CATEGORIES, sdocs)
        },
    }


@pytest.fixture(scope="function")
def news20_doc_dataset(db_session, test_project) -> DocDataset:
    """Import the full 20-newsgroups training split as tagged documents.

    Each document carries its category tag (the classification classes) plus
    exactly one subset tag; `subset2sdoc_ids` maps subset name -> sdoc ids.
    """
    ds = load_dataset("SetFit/20_newsgroups", split="train")

    # Fail loudly if the dataset's categories drift from our constants
    # (the `label` column is a plain int Value, not a ClassLabel, so the
    # category names must be collected from the `label_text` data)
    dataset_categories = set(ds["label_text"])
    assert dataset_categories == set(NEWS20_CATEGORIES), (
        f"20NG categories changed, update NEWS20_CATEGORIES: {sorted(dataset_categories)}"
    )

    # 1. Create tags (one per category = the classification classes)
    tags: dict[str, TagORM] = {}
    for category in NEWS20_CATEGORIES:
        tags[category] = crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name=category,
                description=f"20NG category {category}",
                project_id=test_project.id,
            ),
        )

    # 2. Create dataset folder
    folder_id = _create_dataset_folder(db_session, test_project, "20_newsgroups")

    # 3. Import docs (one sdoc per newsgroup post)
    docs: list[tuple[str, str, str | list[str]]] = []
    doc_categories: list[str] = []
    for i, row in enumerate(cast(Iterable[News20DatasetRow], ds)):
        category = row["label_text"]
        text = row["text"].strip()
        if len(text) < 50:
            continue
        docs.append(
            (
                f"news20_{i}_{category.replace('.', '_')}.txt",
                f"20NG {category} {i}",
                text,
            )
        )
        doc_categories.append(category)
    sdocs = _import_text_sdocs(db_session, test_project, folder_id, docs)
    sdoc_ids = [sdoc.id for sdoc in sdocs]

    # 4. Tag docs with their category (one bulk call per category)
    category2sdoc_ids: dict[str, list[int]] = {
        category: [] for category in NEWS20_CATEGORIES
    }
    for sdoc, category in zip(sdocs, doc_categories):
        category2sdoc_ids[category].append(sdoc.id)
    for category, ids in category2sdoc_ids.items():
        crud_tag.link_multiple_tags(
            db=db_session, sdoc_ids=ids, tag_ids=[tags[category].id]
        )

    # 5. Create subset tags + split sdocs into train/eval/test subsets
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(db_session, sdoc_ids, subset_tags)

    db_session.commit()
    return {
        "project": test_project,
        "tags": tags,
        "subset_tags": subset_tags,
        "subset2sdoc_ids": subsets,
        "category2sdoc_ids": category2sdoc_ids,
    }


# ---------------------------------------------------------------------------
# SENTENCE DATASET (CSAbstruct)
# ---------------------------------------------------------------------------

# CSAbstruct label names (lowercase in the dataset's ClassLabel feature)
CSABSTRUCT_LABELS = ["background", "objective", "method", "result", "other"]


class CSAbstructDatasetRow(TypedDict):
    sentences: list[str]
    labels: list[int]


class SentDataset(TypedDict):
    project: ProjectORM
    codes: dict[str, CodeORM]
    tags: SubsetTags
    subset2sdoc_ids: dict[str, list[int]]


@pytest.fixture(scope="function")
def sentence_statistics_dataset(db_session, test_project, test_user) -> SentDataset:
    """Create five tagged documents with deterministic sentence annotations.

    The fixture creates one document for each class: background, objective,
    method, result, and other. Every document contains two sentences, and
    ``test_user`` annotates both sentences with that document's class. Across all
    five documents, the complete fixture therefore contains 10 sentences and all
    10 are annotated.

    Every document receives exactly one of the training-data, evaluation-data,
    or test-data tags through deterministic round-robin assignment. The returned
    ``subset2sdoc_ids`` maps those subset names to their document IDs.
    """
    codes = {
        label: crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=label,
                description=f"Synthetic sentence label {label}",
                parent_id=None,
                enabled=True,
                project_id=test_project.id,
                is_system=False,
            ),
        )
        for label in CSABSTRUCT_LABELS
    }
    folder_id = _create_dataset_folder(db_session, test_project, "sentence-statistics")
    sentences = ["First synthetic sentence.", "Second synthetic sentence."]
    sdocs = _import_text_sdocs(
        db_session,
        test_project,
        folder_id,
        [
            (f"sentence_stats_{i}.txt", f"Sentence statistics {label}", sentences)
            for i, label in enumerate(CSABSTRUCT_LABELS)
        ],
    )
    sent_dtos = [
        SentenceAnnotationCreate(
            sentence_id_start=sentence_id,
            sentence_id_end=sentence_id,
            code_id=codes[label].id,
            sdoc_id=sdoc.id,
        )
        for sdoc, label in zip(sdocs, CSABSTRUCT_LABELS)
        for sentence_id in range(len(sentences))
    ]
    crud_sentence_anno.create_bulk(
        db=db_session,
        user_id=test_user.id,
        create_dtos=sent_dtos,
    )
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(
        db_session,
        [sdoc.id for sdoc in sdocs],
        subset_tags,
    )
    db_session.commit()
    return {
        "project": test_project,
        "codes": codes,
        "tags": subset_tags,
        "subset2sdoc_ids": subsets,
    }


@pytest.fixture(scope="function")
def csabstruct_sent_dataset(db_session, test_project, test_user) -> SentDataset:
    """Import the full CSAbstruct training split as sentence annotations (one sdoc per abstract).

    Sdocs are split into train/eval/test thirds tagged training-data /
    evaluation-data / test-data; `subset2sdoc_ids` maps subset name -> sdoc ids.
    """
    ds = load_dataset("allenai/csabstruct", split="train")

    # Fail loudly if the dataset's labels drift from our constants
    # (labels are ClassLabel ints; the string names live in the feature metadata)
    label_names: list[str] = ds.features["labels"].feature.names
    assert set(label_names) == set(CSABSTRUCT_LABELS), (
        f"CSAbstruct labels changed, update CSABSTRUCT_LABELS: {label_names}"
    )

    # 1. Create codes (one per label)
    codes: dict[str, CodeORM] = {}
    for label in CSABSTRUCT_LABELS:
        codes[label] = crud_code.create(
            db=db_session,
            create_dto=CodeCreate(
                name=label,
                description=f"CSAbstruct label {label}",
                parent_id=None,
                enabled=True,
                project_id=test_project.id,
                is_system=False,
            ),
        )

    # 2. Create dataset folder
    folder_id = _create_dataset_folder(db_session, test_project, "csabstruct")

    # 3. Import docs (one sdoc per abstract)
    docs: list[tuple[str, str, str | list[str]]] = []
    example_label_ids: list[list[int]] = []
    for i, row in enumerate(cast(Iterable[CSAbstructDatasetRow], ds)):
        docs.append((f"csabstruct_{i}.txt", f"CSAbstruct {i}", row["sentences"]))
        example_label_ids.append(row["labels"])
    sdocs = _import_text_sdocs(db_session, test_project, folder_id, docs)
    sdoc_ids = [sdoc.id for sdoc in sdocs]

    # 4. Create sentence annotations
    sent_dtos: list[SentenceAnnotationCreate] = []
    for sdoc, label_ids in zip(sdocs, example_label_ids):
        labels: list[str] = [label_names[label_id] for label_id in label_ids]
        for sent_idx, label in enumerate(labels):
            if label in codes:
                sent_dtos.append(
                    SentenceAnnotationCreate(
                        sentence_id_start=sent_idx,
                        sentence_id_end=sent_idx,
                        code_id=codes[label].id,
                        sdoc_id=sdoc.id,
                    )
                )

    crud_sentence_anno.create_bulk(
        db=db_session, user_id=test_user.id, create_dtos=sent_dtos
    )

    # 5. Create subset tags + split sdocs into train/eval/test subsets
    subset_tags = _create_subset_tags(db_session, test_project)
    subsets = _link_subset_tags(db_session, sdoc_ids, subset_tags)
    db_session.commit()
    return {
        "project": test_project,
        "codes": codes,
        "tags": subset_tags,
        "subset2sdoc_ids": subsets,
    }
