from collections.abc import Generator
from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.system_codes import SystemCode
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_dto import SourceDocumentCreate
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from dats_test_utils import create_span_for_text, create_text_document
from feature_test_utils import (
    FeatureProject,
    PartlyProject,
    _create_sdoc,
    create_feature_project,
    create_partly_project,
    create_project_with_features,
    feature_named,
    minimal_text_steps,
    off_by_default_feature,
    set_step_status,
)
from pipeline_test_utils import artefact_named, planned_steps
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.collection_base import BaseCollection
from repos.vector.weaviate_repo import WeaviateRepo
from systems.artefact_system.artefact_registry import artefact, artefact_registry
from systems.feature_system.feature_registry import (
    Feature,
    feature_registry,
    register_feature,
)
from systems.feature_system.feature_service import FeatureService
from systems.feature_system.feature_system_enum import FeatureArea


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`."""
    return create_feature_project(db_session, test_user)


@pytest.fixture(scope="function")
def partly_project(db_session, test_user: UserORM) -> PartlyProject:
    """The project described in `PartlyProject`."""
    return create_partly_project(db_session, test_user)


class DuplicateFinderProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Duplicate Finder Project" of `test_user`, with only the
      duplicate finder enabled
    - text: text document "text.txt" with the text of `SDOC_SENTENCES` and the
      language "en"; the minimal text steps are finished, all other steps
      (word_frequency among them) are not planned

    Non-obvious derived behavior:

    - The duplicate finder and word frequency analysis need the same artefact,
      the word frequencies: the duplicate finder is partly available, word
      frequency analysis is disabled.
    """

    project: ProjectORM
    text: SourceDocumentORM


@pytest.fixture(scope="function")
def duplicate_finder_project(db_session, test_user: UserORM) -> DuplicateFinderProject:
    """The project described in `DuplicateFinderProject`."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Duplicate Finder Project",
        features=["duplicate_finder"],
    )
    text = _create_sdoc(
        db_session,
        project,
        name="text.txt",
        doctype=DocType.text,
        status=dict.fromkeys(minimal_text_steps(), 1),
    )
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(text)
    return {"project": project, "text": text}


class UploadingProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Uploading Project" of `test_user`, with keyword statistics
      enabled
    - uploading: text document "uploading.txt" with the text of
      `SDOC_SENTENCES` and the language "en", still being uploaded: all steps
      a text document of this project gets (html_extraction, text_extraction,
      language_detection, tokens_sentences, html_mapping, keywords)
      are processing, and the job of html_extraction runs

    Non-obvious derived behavior:

    - Every processing step of uploading is a core step except keywords,
      which waits for the language detection.
    """

    project: ProjectORM
    uploading: SourceDocumentORM


@pytest.fixture(scope="function")
def uploading_project(db_session, test_user: UserORM) -> UploadingProject:
    """The project described in `UploadingProject`."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Uploading Project",
        features=["keyword_statistics"],
    )
    steps = planned_steps(DocType.text, ["keyword_statistics"])
    uploading = _create_sdoc(
        db_session,
        project,
        name="uploading.txt",
        doctype=DocType.text,
        status=dict.fromkeys(steps, 0),
    )
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(uploading)
    return {"project": project, "uploading": uploading}


class ActivationProject(TypedDict):
    """
    This fixture sets up the following project, for computations that run the
    real worker (Ray included):

    - project: "Activation Project" of `test_user`, without any enabled feature
    - tokenized: text document "tokenized.txt" with the sentences "Hello
      world." and "The cat sits on the mat." and the language "en"; the steps of
      a project without features are finished (html_extraction, text_extraction,
      language_detection, tokens_sentences, html_mapping), all other steps
      are not planned
    - extracted: text document "extracted.txt" with the same text; only
      html_extraction and text_extraction are finished, all other steps are not
      planned
    - no_data: text document "no_data.txt" without any content (no
      SourceDocumentData); the steps of a project without features are finished

    Non-obvious derived behavior:

    - No step job of no_data can start: its enricher finds no content, so every
      step a computation plans for it becomes erroneous.
    - A computation plans the not planned core steps of extracted too, so it
      runs the whole text chain from the language detection on.
    """

    project: ProjectORM
    tokenized: SourceDocumentORM
    extracted: SourceDocumentORM
    no_data: SourceDocumentORM


@pytest.fixture(scope="function")
def activation_project(db_session, test_user: UserORM) -> ActivationProject:
    """The project described in `ActivationProject`."""
    project = create_project_with_features(
        db_session, test_user, title="Activation Project", features=[]
    )
    sentences = ["Hello world.", "The cat sits on the mat."]
    tokenized = create_text_document(
        db_session,
        project=project,
        filename="tokenized.txt",
        name="tokenized.txt",
        sentences=sentences,
    )
    extracted = create_text_document(
        db_session,
        project=project,
        filename="extracted.txt",
        name="extracted.txt",
        sentences=sentences,
    )
    db_session.flush()
    set_step_status(db_session, tokenized.id, dict.fromkeys(minimal_text_steps(), 1))
    set_step_status(
        db_session, extracted.id, {"html_extraction": 1, "text_extraction": 1}
    )
    no_data = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="no_data.txt",
            name="no_data.txt",
            doctype=DocType.text,
            project_id=project.id,
        ),
    )
    set_step_status(db_session, no_data.id, dict.fromkeys(minimal_text_steps(), 1))
    db_session.commit()
    for obj in (project, tokenized, extracted, no_data):
        db_session.refresh(obj)
    return {
        "project": project,
        "tokenized": tokenized,
        "extracted": extracted,
        "no_data": no_data,
    }


@pytest.fixture(scope="function")
def off_by_default() -> Generator[Feature, None, None]:
    """The test feature of `off_by_default_feature`, registered for the test."""
    with off_by_default_feature() as feature:
        yield feature


@pytest.fixture(scope="function")
def removed_feature_project(db_session, test_user: UserORM) -> ProjectORM:
    """
    This fixture sets up the project "Removed Feature Project" of `test_user`,
    without documents. Its stored enabled features are "keyword_statistics" and
    "removed_feature", a name no registered feature has (as after a feature
    was removed from DATS).
    """
    project = create_project_with_features(
        db_session,
        test_user,
        title="Removed Feature Project",
        features=["keyword_statistics"],
    )
    project.enabled_features = ["keyword_statistics", "removed_feature"]
    db_session.commit()
    db_session.refresh(project)
    return project


# the code tree the artefact of `coded_feature` declares
CODED_TREE = SystemCode(
    name="TEST_CODED_TREE",
    description="The codes of the test artefact",
    children=(SystemCode(name="TEST_CODED_LEAF", description="A leaf"),),
)


@pytest.fixture(scope="function")
def coded_feature() -> Generator[Feature, None, None]:
    """
    Registers, for the test, the artefact "test_coded_artefact" (document data,
    on demand, the uploaded file of an audio document, so no step needs to
    produce it), which declares the code tree `CODED_TREE` (`TEST_CODED_TREE` >
    `TEST_CODED_LEAF`), and the feature "test_coded_feature" (area Analysis,
    `default_enabled=False`), which requires it. Both are removed afterwards.

    Non-obvious derived behavior:

    - A project has the two codes only once the set up ran for the feature
      (Enable, a project creation or an import that enables it).
    """
    coded = artefact(
        "test_coded_artefact",
        title="Test coded",
        uploaded_for={DocType.audio},
        codes=(CODED_TREE,),
    )
    feature = register_feature(
        "test_coded_feature",
        title="Test Coded Feature",
        description="A test feature whose artefact declares codes.",
        area=FeatureArea.ANALYSIS,
        requires_artefacts={coded},
        default_enabled=False,
    )
    try:
        yield feature
    finally:
        feature_registry.unregister_feature(feature.name)
        artefact_registry.unregister_artefact(coded.name)


# what the set-up hook finds of a complete project: the system code
# `TEST_CODED_TREE`, the project metadata, the search index and the Weaviate
# tenants
HOOK_FINDS_ALL = frozenset({"codes", "metadata", "index", "tenants"})


class HookedFeature(TypedDict):
    """The feature of the `hooked_feature` fixture and the calls of its hook."""

    feature: Feature
    # one entry per call of the set-up hook: the project id and what of the
    # project existed at that moment (a subset of `HOOK_FINDS_ALL`)
    calls: list[tuple[int, frozenset[str]]]


@pytest.fixture(scope="function")
def hooked_feature() -> Generator[HookedFeature, None, None]:
    """
    Registers, for the test, the artefact "test_hooked_artefact" (document
    data, on demand, the uploaded file of an audio document, so no step needs
    to produce it), which declares the code tree `CODED_TREE`
    (`TEST_CODED_TREE` > `TEST_CODED_LEAF`), and the feature
    "test_hooked_feature" (area Analysis, `default_enabled=False`), which
    requires it and the keywords and has a set-up hook. The hook records each
    call in `calls`, with what it finds of the project (`HOOK_FINDS_ALL` in a
    complete project). Both are removed afterwards.

    Non-obvious derived behavior:

    - In a project without documents the feature is fully available right
      after Enable and can be disabled at once.
    """
    calls: list[tuple[int, frozenset[str]]] = []

    def _set_up(db: Session, project_id: int) -> None:
        code = crud_code.read_by_name_and_project(
            db=db, code_name=CODED_TREE.name, project_id=project_id
        )
        weaviate = WeaviateRepo().get_client()
        found = {
            "codes": code is not None,
            "metadata": bool(
                crud_project_meta.read_by_project(db=db, project_id=project_id)
            ),
            "index": bool(
                ElasticSearchRepo()
                .get_client()
                .indices.exists(
                    index=crud_sdoc_elastic.index.get_index_name(project_id=project_id)
                )
            ),
            "tenants": all(
                weaviate.collections.get(c.get_collection_name()).tenants.exists(
                    c.get_tenant_name(project_id)
                )
                for c in BaseCollection.all_collections()
            ),
        }
        calls.append((project_id, frozenset(k for k, v in found.items() if v)))

    hooked = artefact(
        "test_hooked_artefact",
        title="Test hooked",
        uploaded_for={DocType.audio},
        codes=(CODED_TREE,),
    )
    feature = register_feature(
        "test_hooked_feature",
        title="Test Hooked Feature",
        description="A test feature with a set-up hook.",
        area=FeatureArea.ANALYSIS,
        requires_artefacts={hooked, artefact_named("keywords")},
        default_enabled=False,
        set_up=_set_up,
    )
    try:
        yield {"feature": feature, "calls": calls}
    finally:
        feature_registry.unregister_feature(feature.name)
        artefact_registry.unregister_artefact(hooked.name)


@pytest.fixture(scope="function")
def hooked_partly_project(
    db_session: Session, test_user: UserORM, hooked_feature: HookedFeature
) -> ProjectORM:
    """The project "Hook Partly", created with the feature of `hooked_feature`
    (its hook ran once for it), with one text document "text_done.txt" whose
    core steps are finished and whose keywords is not planned: the
    feature is partly available."""
    project = create_project_with_features(
        db_session,
        test_user,
        title="Hook Partly",
        features=[hooked_feature["feature"].name],
    )
    _create_sdoc(
        db_session,
        project,
        name="text_done.txt",
        doctype=DocType.text,
        status=dict.fromkeys(minimal_text_steps(), 1),
    )
    db_session.commit()
    return project


class CodeImportProjects(TypedDict):
    """
    This fixture sets up the following projects of `test_user`, without
    documents:

    - entities_disabled: "Entities Disabled", created with automatic entity
      annotations, which were then disabled: it keeps the system code tree
      `NAMED_ENTITY` (with `PERSON`) and enables no feature
    - user_named_entity: "User Named Entity", without any enabled feature, with
      the top-level user code `NAMED_ENTITY` (no parent)
    - target: "Codes Target", without any enabled feature: it has no codes
    - entity_spans: "Entity Spans", with automatic entity annotations enabled
      and one text document "persons.txt" (the sentences "Ada met Alan." and
      "They talked.", with its raw file); its core steps and `named_entity_recognition` are
      finished, and `test_user` annotated "Ada" and "Alan" with the system
      code `PERSON` (below `NAMED_ENTITY`)
    - user_animals: "User Animals", without any enabled feature, with the
      top-level user code `ANIMAL` and below it the user code `DOG` (both
      names of the COCO tree of object detection, which declares `ANIMAL`
      below `SYSTEM_CODE`)
    - entity_target: "Entity Target", with automatic entity annotations
      enabled and no documents: it already has the system code tree
      `NAMED_ENTITY` (with `PERSON`)

    Non-obvious derived behavior:

    - An archive has no `is_system` column: the import decides by the declared
      code trees whether an unknown code is a system code.
    """

    entities_disabled: ProjectORM
    user_named_entity: ProjectORM
    target: ProjectORM
    entity_spans: ProjectORM
    user_animals: ProjectORM
    entity_target: ProjectORM


@pytest.fixture(scope="function")
def code_import_projects(db_session, test_user: UserORM) -> CodeImportProjects:
    """The projects described in `CodeImportProjects`."""
    entities = create_project_with_features(
        db_session,
        test_user,
        title="Entities Disabled",
        features=["entity_annotations"],
    )
    FeatureService().disable_feature(
        db=db_session,
        project_id=entities.id,
        feature=feature_named("entity_annotations"),
    )
    user_code = create_project_with_features(
        db_session, test_user, title="User Named Entity", features=[]
    )
    crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="NAMED_ENTITY", project_id=user_code.id, is_system=False
        ),
    )
    target = create_project_with_features(
        db_session, test_user, title="Codes Target", features=[]
    )
    entity_spans = create_project_with_features(
        db_session, test_user, title="Entity Spans", features=["entity_annotations"]
    )
    sentences = ["Ada met Alan.", "They talked."]
    persons = create_text_document(
        db_session,
        project=entity_spans,
        filename="persons.txt",
        name="persons.txt",
        sentences=sentences,
    )
    FilesystemRepo()._get_dst_path_for_project_sdoc_file(
        project_id=entity_spans.id, filename="persons.txt"
    ).write_text(" ".join(sentences))
    set_step_status(
        db_session,
        persons.id,
        dict.fromkeys([*minimal_text_steps(), "named_entity_recognition"], 1),
    )
    person = crud_code.read_by_name_and_project(
        db=db_session, code_name="PERSON", project_id=entity_spans.id
    )
    assert person is not None
    for text in ("Ada", "Alan"):
        create_span_for_text(
            db_session, sdoc=persons, text=text, code_id=person.id, user_id=test_user.id
        )
    user_animals = create_project_with_features(
        db_session, test_user, title="User Animals", features=[]
    )
    animal = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="ANIMAL", project_id=user_animals.id, is_system=False
        ),
    )
    crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="DOG", project_id=user_animals.id, parent_id=animal.id, is_system=False
        ),
    )
    entity_target = create_project_with_features(
        db_session, test_user, title="Entity Target", features=["entity_annotations"]
    )
    db_session.commit()
    projects = (entities, user_code, target, entity_spans, user_animals, entity_target)
    for project in projects:
        db_session.refresh(project)
    return {
        "entities_disabled": entities,
        "user_named_entity": user_code,
        "target": target,
        "entity_spans": entity_spans,
        "user_animals": user_animals,
        "entity_target": entity_target,
    }
