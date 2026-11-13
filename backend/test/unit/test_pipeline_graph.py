"""The pipeline graph derived from the step declarations, and its startup checks."""

from collections.abc import Mapping

import pytest
from sqlalchemy.orm import Session

from bootstrap import register_jobs
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from core.code.system_codes import SystemCode
from core.doc.source_document_orm import SourceDocumentORM
from pipeline_test_utils import artefact_named
from systems.artefact_system import pipeline_graph
from systems.artefact_system.artefact_exceptions import PipelineDeclarationError
from systems.artefact_system.artefact_registry import (
    Artefact,
    ArtefactArchive,
    ArtefactRegistry,
    artefact_registry,
)
from systems.artefact_system.artefact_system_enum import StorageKind
from systems.artefact_system.pipeline_graph import PipelineGraph, PipelineStep

# the registered artefacts, which the graphs below are built with
register_jobs()

ALL_DOCTYPES = frozenset(DocType)


def _step(
    requires: set[Artefact],
    produces: set[Artefact],
    doctypes: frozenset[DocType] = ALL_DOCTYPES,
) -> PipelineStep:
    return PipelineStep(
        requires=frozenset(requires),
        produces=frozenset(produces),
        doctypes=doctypes,
    )


# the two root steps of `_producing_all_other_artefacts`, in pipeline order
FILLERS = [JobType.VIDEO_METADATA_EXTRACTION, JobType.VIDEO_THUMBNAIL]


def _producing_all_other_artefacts(
    steps: dict[JobType, PipelineStep],
) -> dict[JobType, PipelineStep]:
    """Adds two root steps that produce every registered artefact the given
    steps do not produce, so a test only sees the problem it sets up:
    VIDEO_METADATA_EXTRACTION the always-computed ones, VIDEO_THUMBNAIL the
    on-demand ones (a step must not mix them). The uploaded audio needs none."""
    produced = {a for s in steps.values() for a in s.produces}
    rest = set(artefact_registry.artefacts()) - produced - {artefact_named("audio")}
    return {
        **steps,
        JobType.VIDEO_METADATA_EXTRACTION: _step(set(), {a for a in rest if a.always}),
        JobType.VIDEO_THUMBNAIL: _step(set(), {a for a in rest if not a.always}),
    }


def _graph(steps: dict[JobType, PipelineStep]) -> PipelineGraph:
    """The graph of these steps and the registered artefacts."""
    return PipelineGraph(steps, artefact_registry.artefacts())


def _problems(steps: dict[JobType, PipelineStep]) -> list[str]:
    with pytest.raises(PipelineDeclarationError) as exc_info:
        _graph(steps)
    return exc_info.value.problems


# ===========================================================================
# PIPELINE GRAPH: DERIVATION
# ===========================================================================


def test_pipeline_graph_derives_order_roots_and_successors():
    """A step depends on the producers of its required artefacts. Only direct
    predecessors start a step: spacy needs content and language, but is started
    by language detection only, which itself needs content."""
    steps = _producing_all_other_artefacts(
        {
            JobType.TEXT_EXTRACTION: _step(set(), {artefact_named("content")}),
            JobType.TEXT_LANGUAGE_DETECTION: _step(
                {artefact_named("content")}, {artefact_named("language")}
            ),
            JobType.TEXT_SPACY: _step(
                {artefact_named("content"), artefact_named("language")},
                {artefact_named("tokens_sentences")},
            ),
        }
    )

    graph = _graph(steps)

    assert graph.steps(DocType.text) == [
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        *FILLERS,
    ]
    assert graph.roots(DocType.text) == [JobType.TEXT_EXTRACTION, *FILLERS]
    assert graph.successors(JobType.TEXT_EXTRACTION) == [
        JobType.TEXT_LANGUAGE_DETECTION
    ]
    assert graph.successors(JobType.TEXT_LANGUAGE_DETECTION) == [JobType.TEXT_SPACY]
    assert graph.successors(JobType.TEXT_SPACY) == []


def test_pipeline_graph_orders_doctype_specific_steps_first():
    """Among the steps that are ready, the steps of fewer doctypes come first,
    so the image steps precede the text steps on the caption, although the
    caption makes text extraction ready first."""
    image = frozenset({DocType.image})
    image_audio = frozenset({DocType.image, DocType.audio})
    steps = _producing_all_other_artefacts(
        {
            JobType.IMAGE_CAPTION: _step(set(), {artefact_named("raw_html")}, image),
            JobType.IMAGE_THUMBNAIL: _step(set(), {artefact_named("thumbnail")}, image),
            JobType.TEXT_EXTRACTION: _step(
                {artefact_named("raw_html")}, {artefact_named("content")}, image_audio
            ),
            JobType.AUDIO_TRANSCRIPTION: _step(
                set(), {artefact_named("raw_html")}, frozenset({DocType.audio})
            ),
        }
    )

    graph = _graph(steps)

    assert graph.steps(DocType.image)[:3] == [
        JobType.IMAGE_CAPTION,
        JobType.IMAGE_THUMBNAIL,
        JobType.TEXT_EXTRACTION,
    ]


def test_pipeline_graph_uploaded_audio_satisfies_the_audio_requirement():
    """An audio document is its own audio stream; a video's is extracted."""
    av = frozenset({DocType.audio, DocType.video})
    steps = _producing_all_other_artefacts(
        {
            JobType.VIDEO_AUDIO_EXTRACTION: _step(
                set(), {artefact_named("audio")}, frozenset({DocType.video})
            ),
            JobType.AUDIO_TRANSCRIPTION: _step(
                {artefact_named("audio")}, {artefact_named("transcript")}, av
            ),
        }
    )

    graph = _graph(steps)

    assert JobType.AUDIO_TRANSCRIPTION in graph.roots(DocType.audio)
    assert JobType.AUDIO_TRANSCRIPTION not in graph.roots(DocType.video)
    assert graph.successors(JobType.VIDEO_AUDIO_EXTRACTION) == [
        JobType.AUDIO_TRANSCRIPTION
    ]


# ===========================================================================
# PIPELINE GRAPH: STEPS FOR ARTEFACTS AND STEP RELATIONS
# ===========================================================================

TEXT = frozenset({DocType.text})
IMAGE = frozenset({DocType.image})
TEXT_IMAGE = frozenset({DocType.text, DocType.image})


def _planning_graph() -> PipelineGraph:
    """Text gets its raw HTML from extract_html, an image from its caption,
    which produces the core caption and the core raw HTML. Keywords are
    optional and the document embeddings require them."""
    return _graph(
        _producing_all_other_artefacts(
            {
                JobType.EXTRACT_HTML: _step(set(), {artefact_named("raw_html")}, TEXT),
                JobType.IMAGE_CAPTION: _step(
                    set(),
                    {artefact_named("image_caption"), artefact_named("raw_html")},
                    IMAGE,
                ),
                JobType.IMAGE_THUMBNAIL: _step(
                    set(), {artefact_named("thumbnail")}, IMAGE
                ),
                JobType.TEXT_EXTRACTION: _step(
                    {artefact_named("raw_html")},
                    {artefact_named("content")},
                    TEXT_IMAGE,
                ),
                JobType.TEXT_LANGUAGE_DETECTION: _step(
                    {artefact_named("content")},
                    {artefact_named("language")},
                    TEXT_IMAGE,
                ),
                JobType.TEXT_KEYWORDS: _step(
                    {artefact_named("language")},
                    {artefact_named("keywords")},
                    TEXT_IMAGE,
                ),
                JobType.TEXT_DOCUMENT_EMBEDDING: _step(
                    {artefact_named("keywords")},
                    {artefact_named("document_embeddings")},
                    TEXT_IMAGE,
                ),
            }
        )
    )


def test_steps_for_are_the_producers_of_the_artefacts_and_their_inputs():
    """The keywords need the steps before them, not the document embeddings;
    an image gets its text from the caption."""
    graph = _planning_graph()

    assert graph.steps_for(DocType.text, frozenset({artefact_named("keywords")})) == [
        JobType.EXTRACT_HTML,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_KEYWORDS,
    ]
    assert graph.steps_for(DocType.image, frozenset({artefact_named("keywords")})) == [
        JobType.IMAGE_CAPTION,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_KEYWORDS,
    ]


def test_steps_for_pull_in_the_artefacts_a_step_requires():
    """The document embeddings require the keywords, so their step is needed
    although the keywords are not asked for themselves."""
    graph = _planning_graph()

    steps = graph.steps_for(
        DocType.text, frozenset({artefact_named("document_embeddings")})
    )

    assert steps[-2:] == [JobType.TEXT_KEYWORDS, JobType.TEXT_DOCUMENT_EMBEDDING]


def test_steps_for_skip_an_artefact_without_producer_for_the_doctype():
    """The thumbnail has a producer for images only: for a text document it
    adds no step, the keywords still do."""
    graph = _planning_graph()

    assert graph.steps_for(
        DocType.text,
        frozenset({artefact_named("thumbnail"), artefact_named("keywords")}),
    ) == graph.steps_for(DocType.text, frozenset({artefact_named("keywords")}))


def test_artefacts_apply_if_each_has_a_producer_or_is_uploaded():
    """The thumbnail applies to images only; the uploaded audio stream to audio
    documents; a set applies only if all its artefacts do."""
    graph = _planning_graph()
    thumbnail = frozenset({artefact_named("thumbnail")})

    assert graph.applies(DocType.image, thumbnail)
    assert not graph.applies(DocType.text, thumbnail)
    assert not graph.applies(DocType.text, thumbnail | {artefact_named("keywords")})
    assert graph.applies(DocType.audio, frozenset({artefact_named("audio")}))
    assert not graph.applies(DocType.video, frozenset({artefact_named("audio")}))


def test_inputs_are_the_producers_of_the_required_artefacts_per_doctype():
    """Text extraction reads the raw HTML of extract_html in a text document and
    of the caption in an image."""
    graph = _planning_graph()

    assert graph.inputs(DocType.text, JobType.TEXT_EXTRACTION) == [JobType.EXTRACT_HTML]
    assert graph.inputs(DocType.image, JobType.TEXT_EXTRACTION) == [
        JobType.IMAGE_CAPTION
    ]
    assert graph.inputs(DocType.text, JobType.EXTRACT_HTML) == []


def test_descendants_are_the_steps_after_a_step_transitively():
    graph = _planning_graph()

    assert graph.descendants([JobType.TEXT_LANGUAGE_DETECTION]) == [
        JobType.TEXT_KEYWORDS,
        JobType.TEXT_DOCUMENT_EMBEDDING,
    ]
    assert graph.descendants([JobType.TEXT_DOCUMENT_EMBEDDING]) == []


# ===========================================================================
# PIPELINE GRAPH: STARTUP CHECKS
# ===========================================================================


def test_pipeline_graph_fails_on_artefact_nobody_produces():
    """Every artefact must be produced by a step."""
    problems = _problems(
        {JobType.TEXT_EXTRACTION: _step(set(), {artefact_named("content")})},
    )

    assert "Artefact 'es_index' is produced by no step." in problems


def test_pipeline_graph_fails_on_required_artefact_not_produced_for_doctype():
    """A step of a doctype must find its required artefacts in that doctype."""
    steps = _producing_all_other_artefacts(
        {
            JobType.IMAGE_CAPTION: _step(
                set(), {artefact_named("image_caption")}, frozenset({DocType.image})
            ),
            JobType.IMAGE_EMBEDDING: _step(
                {artefact_named("image_caption")}, {artefact_named("image_embeddings")}
            ),
        }
    )

    problems = _problems(steps)

    assert any(
        "'image_embedding' requires artefact 'image_caption'" in p
        and "doctype 'text'" in p
        for p in problems
    ), problems


def test_pipeline_graph_fails_on_cycle():
    """Two steps that require each other's artefacts form a cycle."""
    steps = _producing_all_other_artefacts(
        {
            JobType.TEXT_SPACY: _step(
                {artefact_named("language")}, {artefact_named("content")}
            ),
            JobType.TEXT_LANGUAGE_DETECTION: _step(
                {artefact_named("content")}, {artefact_named("language")}
            ),
        }
    )

    problems = _problems(steps)

    assert "The steps of doctype 'text' contain a cycle." in problems


def test_pipeline_graph_fails_on_artefact_produced_twice():
    """One artefact per doctype has one producer, else its consumers are ambiguous."""
    steps = _producing_all_other_artefacts(
        {
            JobType.TEXT_EXTRACTION: _step(set(), {artefact_named("content")}),
            JobType.EXTRACT_HTML: _step(set(), {artefact_named("content")}),
        }
    )

    problems = _problems(steps)

    assert any("'content'" in p and "several steps" in p for p in problems), problems


def test_pipeline_graph_fails_on_step_with_two_direct_predecessors():
    """Steps do not wait for all their inputs yet, so a step started by two
    independent steps would run twice."""
    steps = _producing_all_other_artefacts(
        {
            JobType.TEXT_EXTRACTION: _step(set(), {artefact_named("content")}),
            JobType.EXTRACT_HTML: _step(set(), {artefact_named("raw_html")}),
            JobType.TEXT_HTML_MAPPING: _step(
                {artefact_named("content"), artefact_named("raw_html")},
                {artefact_named("html")},
            ),
        }
    )

    problems = _problems(steps)

    assert any(
        "'text_html_mapping'" in p and "started by several steps" in p for p in problems
    ), problems


def test_pipeline_graph_fails_on_more_steps_than_the_feature_states_count(
    monkeypatch: pytest.MonkeyPatch,
):
    """The feature states count each step as one bit of a BIGINT: a pipeline
    with more steps than that fails with a clear message."""
    monkeypatch.setattr(pipeline_graph, "MAX_COUNTED_STEPS", 1)
    steps = _producing_all_other_artefacts(
        {JobType.EXTRACT_HTML: _step(set(), {artefact_named("raw_html")})}
    )

    problems = _problems(steps)

    assert (
        "There are 3 pipeline steps, but the feature states count at most 1 "
        "(one bit each in a BIGINT, see crud_sdoc_step_status.count_by_project)."
    ) in problems


def _test_artefact(
    name: str,
    kind: StorageKind = StorageKind.DOCUMENT_DATA,
    always: bool = False,
    archive: ArtefactArchive | None = None,
    codes: tuple[SystemCode, ...] = (),
) -> Artefact:
    """An artefact that is not registered."""
    return Artefact(
        name=name,
        kind=kind,
        always=always,
        uploaded_for=frozenset(),
        codes=codes,
        archive=archive,
    )


class _NoArchive(ArtefactArchive):
    def read(self, sdoc: SourceDocumentORM) -> dict[str, object]:
        return {}

    def write(
        self, db: Session, sdoc: SourceDocumentORM, archived: Mapping[str, object]
    ) -> None:
        return None


def test_pipeline_graph_fails_on_an_own_store_without_archive_and_vice_versa():
    """An artefact has an archive exactly if it has its own store."""
    steps = _producing_all_other_artefacts({})
    lacking = _test_artefact("test_lacking", kind=StorageKind.OWN_STORE)
    extra = _test_artefact("test_extra", archive=_NoArchive())
    steps[JobType.EXTRACT_HTML] = _step(set(), {lacking, extra})

    problems = [
        p
        for p in _graph_problems(
            steps, [*artefact_registry.artefacts(), lacking, extra]
        )
        if "archive" in p
    ]

    assert problems == [
        "Artefact 'test_extra' must declare an archive exactly if it has its own store.",
        "Artefact 'test_lacking' must declare an archive exactly if it has its own store.",
    ]


def test_pipeline_graph_fails_on_a_step_mixing_always_and_on_demand_artefacts():
    """A step produces either always-computed or on-demand artefacts."""
    steps = _producing_all_other_artefacts({})
    mixed = _test_artefact("test_on_demand")
    steps[JobType.EXTRACT_HTML] = _step(
        set(), {_test_artefact("test_always", always=True), mixed}
    )

    assert (
        "Step 'extract_html' produces always-computed and on-demand artefacts."
        in _graph_problems(steps, artefact_registry.artefacts())
    )


def test_pipeline_graph_fails_on_an_always_step_requiring_an_on_demand_artefact():
    """The step of an always-computed artefact requires only always-computed
    ones, so the core steps never wait for an on-demand step."""
    steps = _producing_all_other_artefacts({})
    steps[JobType.EXTRACT_HTML] = _step(
        {artefact_named("keywords")}, {_test_artefact("test_always", always=True)}
    )

    assert (
        "Step 'extract_html' produces an always-computed artefact but requires an "
        "on-demand one." in _graph_problems(steps, artefact_registry.artefacts())
    )


def _graph_problems(
    steps: dict[JobType, PipelineStep], artefacts: list[Artefact]
) -> list[str]:
    with pytest.raises(PipelineDeclarationError) as exc_info:
        PipelineGraph(steps, artefacts)
    return exc_info.value.problems


# ===========================================================================
# ARTEFACT REGISTRY: STARTUP CHECK OF THE SYSTEM CODES
# ===========================================================================


def test_registry_check_fails_on_a_system_code_declared_differently():
    """A code name is unique in a project: two artefacts that declare the code
    `PERSON` with different descriptions are rejected; the same tree declared
    by two artefacts is fine. The registry holds one step that produces the
    test artefacts."""
    person = SystemCode(name="PERSON", description="A person")
    tree = SystemCode(name="NAMED_ENTITY", description="Entities", children=(person,))
    other = SystemCode(
        name="NAMED_ENTITY",
        description="Entities",
        children=(SystemCode(name="PERSON", description="Someone"),),
    )
    artefacts = [
        _test_artefact("test_first", codes=(tree,)),
        _test_artefact("test_same", codes=(tree,)),
    ]
    registry = ArtefactRegistry()
    for declared in artefacts:
        registry.register_artefact(declared)
    registry.register_step(JobType.EXTRACT_HTML, _step(set(), set(artefacts), TEXT))
    registry.check()

    artefacts.append(_test_artefact("test_other", codes=(other,)))
    registry.register_artefact(artefacts[-1])
    registry.register_step(JobType.EXTRACT_HTML, _step(set(), set(artefacts), TEXT))
    with pytest.raises(PipelineDeclarationError) as exc_info:
        registry.check()

    assert exc_info.value.problems == [
        "System code 'PERSON' is declared differently by artefact 'test_other' "
        "and another artefact (parent, description or enabled flag)."
    ]


# ===========================================================================
# PIPELINE GRAPH: JOBS WITH SEVERAL STEPS
# ===========================================================================

_SPACY_REQUIRES = {artefact_named("content"), artefact_named("language")}


def _further_step(produces: set[Artefact], job: JobType) -> PipelineStep:
    return PipelineStep(
        requires=frozenset(_SPACY_REQUIRES),
        produces=frozenset(produces),
        doctypes=ALL_DOCTYPES,
        job=job,
    )


def _spacy_steps() -> dict[JobType, PipelineStep]:
    """text_spacy with its further steps keywords and named entities, and the
    steps before and after it."""
    return _producing_all_other_artefacts(
        {
            JobType.TEXT_EXTRACTION: _step(set(), {artefact_named("content")}),
            JobType.TEXT_LANGUAGE_DETECTION: _step(
                {artefact_named("content")}, {artefact_named("language")}
            ),
            JobType.TEXT_SPACY: _step(
                _SPACY_REQUIRES, {artefact_named("tokens_sentences")}
            ),
            JobType.TEXT_KEYWORDS: _further_step(
                {artefact_named("keywords")}, JobType.TEXT_SPACY
            ),
            JobType.TEXT_NER: _further_step(
                {artefact_named("ner_spans")}, JobType.TEXT_SPACY
            ),
            JobType.TEXT_HTML_MAPPING: _step(
                {artefact_named("tokens_sentences")}, {artefact_named("html")}
            ),
        }
    )


def test_pipeline_graph_lists_further_steps_of_a_job_as_steps():
    """The further steps of a job are steps of the doctype with their own
    status column, computed by the job."""
    graph = _graph(_spacy_steps())

    assert graph.steps(DocType.text)[2:5] == [
        JobType.TEXT_SPACY,
        JobType.TEXT_KEYWORDS,
        JobType.TEXT_NER,
    ]
    assert graph.job(JobType.TEXT_NER) == JobType.TEXT_SPACY
    assert graph.job(JobType.TEXT_SPACY) == JobType.TEXT_SPACY
    assert graph.job_steps(JobType.TEXT_SPACY) == [
        JobType.TEXT_SPACY,
        JobType.TEXT_KEYWORDS,
        JobType.TEXT_NER,
    ]
    assert graph.job_steps(JobType.TEXT_EXTRACTION) == [JobType.TEXT_EXTRACTION]


def test_pipeline_graph_starts_one_job_for_all_its_steps():
    """Language detection starts the spacy job once, computing all its steps."""
    graph = _graph(_spacy_steps())

    assert graph.next_jobs([JobType.TEXT_LANGUAGE_DETECTION]) == {
        JobType.TEXT_SPACY: [
            JobType.TEXT_SPACY,
            JobType.TEXT_KEYWORDS,
            JobType.TEXT_NER,
        ]
    }


def test_pipeline_graph_only_computed_steps_start_their_successors():
    """A run that computes only the named entities starts nothing; a run that
    computes tokens and sentences starts the HTML mapping."""
    graph = _graph(_spacy_steps())

    ner_only = graph.job_steps(JobType.TEXT_SPACY, [JobType.TEXT_NER])
    assert ner_only == [JobType.TEXT_NER]
    assert graph.next_jobs(ner_only) == {}
    assert graph.next_jobs([JobType.TEXT_SPACY, JobType.TEXT_NER]) == {
        JobType.TEXT_HTML_MAPPING: [JobType.TEXT_HTML_MAPPING]
    }


def test_pipeline_graph_rejects_a_requested_step_of_another_job():
    """A job computes only its own steps."""
    graph = _graph(_spacy_steps())

    with pytest.raises(PipelineDeclarationError):
        graph.job_steps(JobType.TEXT_SPACY, [JobType.TEXT_HTML_MAPPING])


def test_pipeline_graph_fails_on_further_step_with_other_inputs():
    """A further step shares the inputs of its job, as both are computed in
    the same run."""
    steps = _spacy_steps()
    steps[JobType.TEXT_KEYWORDS] = PipelineStep(
        requires=frozenset({artefact_named("content")}),
        produces=frozenset({artefact_named("keywords")}),
        doctypes=ALL_DOCTYPES,
        job=JobType.TEXT_SPACY,
    )

    problems = _problems(steps)

    assert any(
        "'text_keywords' must have the requires and doctypes" in p for p in problems
    ), problems


# ===========================================================================
# THE REGISTERED PIPELINE: STEPS PER ARTEFACT
# ===========================================================================
# The registered steps of DATS (`bootstrap.register_jobs`), asked the way the
# artefact service asks them: the core artefacts, plus the artefacts of a
# feature or of the artefact demand.


@pytest.fixture(scope="module")
def graph() -> PipelineGraph:
    return artefact_registry.graph()


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_every_artefact_needs_every_step_of_the_doctype(
    graph: PipelineGraph, doctype: DocType
):
    """All artefacts together (a project with all features, every existing
    project) need every step of the doctype, in pipeline order."""
    assert graph.steps_for(doctype, graph.artefacts()) == graph.steps(doctype)


@pytest.mark.parametrize("doctype", list(DocType), ids=lambda d: d.value)
def test_the_core_steps_produce_core_artefacts(graph: PipelineGraph, doctype: DocType):
    """The steps of the core artefacts compute no index, embeddings, keywords,
    word frequencies, entities or object boxes alone."""
    for step in graph.steps_for(doctype, artefact_registry.always()):
        assert graph.declaration(step).produces & artefact_registry.always(), step


@pytest.mark.parametrize(
    "doctype,artefact,added_steps",
    [
        # the spaCy outputs are steps of their own
        pytest.param(
            DocType.text,
            artefact_named("keywords"),
            [JobType.TEXT_KEYWORDS],
            id="text-keywords",
        ),
        pytest.param(
            DocType.text,
            artefact_named("ner_spans"),
            [JobType.TEXT_NER],
            id="text-entities",
        ),
        pytest.param(
            DocType.audio,
            artefact_named("word_frequencies"),
            [JobType.TEXT_WORD_FREQUENCY],
            id="audio-word-frequencies",
        ),
        pytest.param(
            DocType.text,
            artefact_named("es_index"),
            [JobType.TEXT_ES_INDEX],
            id="text-index",
        ),
        pytest.param(
            DocType.video,
            artefact_named("document_embeddings"),
            [JobType.TEXT_DOCUMENT_EMBEDDING],
            id="video-document-embeddings",
        ),
        pytest.param(
            DocType.image,
            artefact_named("object_bboxes"),
            [JobType.IMAGE_OBJECT_DETECTION],
            id="image-object-boxes",
        ),
        pytest.param(
            DocType.image,
            artefact_named("image_embeddings"),
            [JobType.IMAGE_EMBEDDING],
            id="image-embeddings",
        ),
        # every image has text: its caption
        pytest.param(
            DocType.image,
            artefact_named("sentence_embeddings"),
            [JobType.TEXT_SENTENCE_EMBEDDING],
            id="image-sentence-embeddings",
        ),
    ],
)
def test_an_artefact_adds_its_producer_to_the_core_steps(
    graph: PipelineGraph,
    doctype: DocType,
    artefact: Artefact,
    added_steps: list[JobType],
):
    """An optional artefact needs its producer besides the core steps."""
    core = set(graph.steps_for(doctype, artefact_registry.always()))
    steps = set(graph.steps_for(doctype, frozenset({artefact})))
    assert steps - core == set(added_steps)


def test_the_steps_of_sentence_embeddings_are_the_text_chain(graph: PipelineGraph):
    """The sentence embeddings of a text document need the steps before them,
    not the HTML mapping; those of an image start with its caption."""
    embeddings = frozenset({artefact_named("sentence_embeddings")})

    assert graph.steps_for(DocType.text, embeddings) == [
        JobType.EXTRACT_HTML,
        JobType.TEXT_EXTRACTION,
        JobType.TEXT_LANGUAGE_DETECTION,
        JobType.TEXT_SPACY,
        JobType.TEXT_SENTENCE_EMBEDDING,
    ]
    assert graph.steps_for(DocType.image, embeddings)[0] == JobType.IMAGE_CAPTION


def test_image_artefacts_do_not_apply_to_text(graph: PipelineGraph):
    """Object boxes apply to images, not to text documents; text artefacts
    apply to every doctype."""
    boxes = frozenset({artefact_named("object_bboxes")})

    assert graph.applies(DocType.image, boxes)
    assert not graph.applies(DocType.text, boxes)
    for doctype in DocType:
        assert graph.applies(doctype, frozenset({artefact_named("es_index")})), doctype
