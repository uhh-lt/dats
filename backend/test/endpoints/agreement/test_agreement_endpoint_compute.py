import pytest
from fastapi.testclient import TestClient

from modules.agreement.agreement_dto import AgreementParams, AgreementResult
from modules.agreement.agreement_enum import AgreementMode

from .conftest import AgreementProject

# Expected (TP, FP, FN) per code name for reference vs. compared on PER, LOC, ORG.
EXPECTED_COUNTS: dict[AgreementMode, dict[str, tuple[int, int, int]]] = {
    AgreementMode.SPAN_STRICT: {"PER": (2, 0, 1), "LOC": (0, 3, 2), "ORG": (0, 3, 0)},
    AgreementMode.SPAN_WORD: {"PER": (2, 0, 1), "LOC": (3, 1, 1), "ORG": (0, 4, 0)},
    AgreementMode.SENTENCE: {"PER": (1, 0, 0), "LOC": (2, 0, 1), "ORG": (0, 1, 0)},
}

# Expected confusion matrix, rows = reference, columns = compared, order PER, LOC,
# ORG, no code.
EXPECTED_MATRIX: dict[AgreementMode, list[list[int]]] = {
    AgreementMode.SPAN_STRICT: [
        [2, 0, 2, 0],
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 3, 1, 0],
    ],
    AgreementMode.SPAN_WORD: [
        [2, 0, 2, 0],
        [0, 3, 0, 1],
        [0, 0, 0, 0],
        [0, 1, 2, 0],
    ],
    AgreementMode.SENTENCE: [
        [1, 0, 1, 0],
        [1, 2, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
}

# Expected segments as (text, number of units), sorted by position.
EXPECTED_SEGMENTS: dict[AgreementMode, list[tuple[str, int]]] = {
    AgreementMode.SPAN_STRICT: [
        ("Anna", 1),
        ("Bob", 1),
        ("in Berlin", 1),
        ("Berlin", 1),
        ("talked about", 1),
        ("Hamburg", 1),
        ("Hamburg and Bremen", 1),
        ("Bremen", 1),
        ("Anna", 1),
    ],
    AgreementMode.SPAN_WORD: [
        ("Anna", 1),
        ("Bob", 1),
        ("in", 1),
        ("Berlin", 1),
        ("talked about", 2),
        ("Hamburg", 1),
        ("and", 1),
        ("Bremen", 1),
        ("Anna", 1),
    ],
    AgreementMode.SENTENCE: [
        ("Anna met Bob in Berlin.", 1),
        ("They talked about Hamburg and Bremen. Then Anna left.", 2),
    ],
}


# ===========================================================================
# COMPUTE AGREEMENT (/agreement/compute) TESTS
# ===========================================================================


def _compute(
    client: TestClient, project_id: int, params: AgreementParams
) -> AgreementResult:
    response = client.post(
        "/agreement/compute",
        params={"project_id": project_id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return AgreementResult.model_validate(response.json())


def _params(
    p: AgreementProject,
    mode: AgreementMode,
    *,
    code_names: list[str] | None = None,
    sdoc_names: list[str] | None = None,
    compared: str = "compared_user",
) -> AgreementParams:
    codes = {
        "PER": p["code_per"],
        "LOC": p["code_loc"],
        "ORG": p["code_org"],
        "MISC": p["code_misc"],
    }
    sdocs = {"A": p["sdoc_a"], "B": p["sdoc_b"]}
    return AgreementParams(
        sdoc_ids=[sdocs[name].id for name in (sdoc_names or ["A", "B"])],
        code_ids=[codes[name].id for name in (code_names or ["PER", "LOC", "ORG"])],
        reference_user_id=p["reference_user"].id,
        compared_user_id=p[compared].id,
        mode=mode,
    )


# --- A. scores and confusion matrix per mode ---------------------------------
# The fixture docstring derives the expected counts for every mode.

ALL_MODES = [
    # Every word is a unit, span boundaries do not matter.
    pytest.param(AgreementMode.SPAN_WORD, id="span-word"),
    # Every span is a unit, only identical offsets match.
    pytest.param(AgreementMode.SPAN_STRICT, id="span-strict"),
    # Every sentence is a unit.
    pytest.param(AgreementMode.SENTENCE, id="sentence"),
]


@pytest.mark.parametrize("mode", ALL_MODES)
def test_compute_agreement_counts_tp_fp_fn_per_code(
    client: TestClient, agreement_project: AgreementProject, mode: AgreementMode
) -> None:
    """Every code is scored separately per unit, in the order of the requested codes."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, mode))

    assert [score.code_id for score in result.code_scores] == [
        p["code_per"].id,
        p["code_loc"].id,
        p["code_org"].id,
    ]
    counts = {
        name: (score.true_positives, score.false_positives, score.false_negatives)
        for name, score in zip(["PER", "LOC", "ORG"], result.code_scores)
    }
    assert counts == EXPECTED_COUNTS[mode]


@pytest.mark.parametrize("mode", ALL_MODES)
def test_compute_agreement_total_is_micro_average_of_counts(
    client: TestClient, agreement_project: AgreementProject, mode: AgreementMode
) -> None:
    """The total sums the counts of all codes and derives P, R and F1 from them."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, mode))

    tp = sum(c[0] for c in EXPECTED_COUNTS[mode].values())
    fp = sum(c[1] for c in EXPECTED_COUNTS[mode].values())
    fn = sum(c[2] for c in EXPECTED_COUNTS[mode].values())
    assert result.total.true_positives == tp
    assert result.total.false_positives == fp
    assert result.total.false_negatives == fn
    assert result.total.precision == pytest.approx(tp / (tp + fp))
    assert result.total.recall == pytest.approx(tp / (tp + fn))
    assert result.total.f1 == pytest.approx(2 * tp / (2 * tp + fp + fn))


def test_compute_agreement_per_code_scores_follow_from_counts(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Word level: PER P 1.0 / R 2/3, LOC P 3/4 / R 3/4, ORG P 0.0 / R undefined."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_WORD))

    per, loc, org = result.code_scores
    assert (per.precision, per.recall, per.f1) == pytest.approx((1.0, 2 / 3, 0.8))
    assert (loc.precision, loc.recall, loc.f1) == pytest.approx((0.75, 0.75, 0.75))
    assert org.precision == 0.0
    assert org.recall is None
    assert org.f1 == 0.0


@pytest.mark.parametrize("mode", ALL_MODES)
def test_compute_agreement_confusion_matrix_counts_every_code_combination(
    client: TestClient, agreement_project: AgreementProject, mode: AgreementMode
) -> None:
    """Cell (X, Y) counts the units with X in the reference and Y in the comparison.

    The last row and column are "no code": missed and over-predicted units. A unit
    with several codes on a side is counted in every combination.
    """
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, mode))

    assert result.confusion_matrix_code_ids == [
        p["code_per"].id,
        p["code_loc"].id,
        p["code_org"].id,
        None,
    ]
    assert result.confusion_matrix == EXPECTED_MATRIX[mode]
    assert result.num_units == sum(n for _, n in EXPECTED_SEGMENTS[mode])


# --- B. segments ---------------------------------------------------------------
# Segments list every compared stretch, agreeing or not, with their annotation IDs.


@pytest.mark.parametrize("mode", ALL_MODES)
def test_compute_agreement_segments_are_sorted_by_position(
    client: TestClient, agreement_project: AgreementProject, mode: AgreementMode
) -> None:
    """Strict spans are never merged; consecutive words / sentences with equal codes are."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, mode))

    assert [(s.text, s.num_units) for s in result.segments] == EXPECTED_SEGMENTS[mode]
    assert {s.sdoc_id for s in result.segments} == {p["sdoc_a"].id}


def test_compute_agreement_strict_segment_with_overlapping_codes(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """'Bob' is PER in the reference and PER + ORG in the comparison: TP PER, FP ORG."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_STRICT))

    bob = result.segments[1]
    spans = p["spans"]
    assert (bob.begin, bob.end, bob.begin_token, bob.end_token) == (9, 12, 2, 3)
    assert bob.sentence_id_start is None and bob.sentence_id_end is None
    assert bob.reference_code_ids == [p["code_per"].id]
    assert bob.compared_code_ids == [p["code_per"].id, p["code_org"].id]
    assert bob.true_positive_code_ids == [p["code_per"].id]
    assert bob.false_positive_code_ids == [p["code_org"].id]
    assert bob.false_negative_code_ids == []
    assert bob.reference_annotation_ids == [spans["ref_bob"].id]
    assert bob.compared_annotation_ids == sorted(
        [spans["cmp_bob_per"].id, spans["cmp_bob_org"].id]
    )


def test_compute_agreement_strict_partial_overlap_is_a_miss_and_an_extra(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """'in Berlin' (compared) and 'Berlin' (reference) are two units that do not match."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_STRICT))

    in_berlin, berlin = result.segments[2], result.segments[3]
    assert in_berlin.false_positive_code_ids == [p["code_loc"].id]
    assert in_berlin.compared_annotation_ids == [p["spans"]["cmp_in_berlin"].id]
    assert in_berlin.reference_annotation_ids == []
    assert berlin.false_negative_code_ids == [p["code_loc"].id]
    assert berlin.reference_annotation_ids == [p["spans"]["ref_berlin"].id]
    assert berlin.compared_annotation_ids == []


def test_compute_agreement_word_level_partial_overlap_matches_shared_words(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Word level: 'in' is an extra LOC, 'Berlin' matches although the spans differ."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_WORD))

    in_, berlin = result.segments[2], result.segments[3]
    assert (in_.begin_token, in_.end_token) == (3, 4)
    assert in_.false_positive_code_ids == [p["code_loc"].id]
    assert (berlin.begin_token, berlin.end_token) == (4, 5)
    assert berlin.true_positive_code_ids == [p["code_loc"].id]
    assert berlin.reference_annotation_ids == [p["spans"]["ref_berlin"].id]
    assert berlin.compared_annotation_ids == [p["spans"]["cmp_in_berlin"].id]


def test_compute_agreement_word_level_merges_consecutive_words(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """'talked about' (two words, ORG in the comparison only) is one segment."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_WORD))

    talked = result.segments[4]
    assert (talked.begin_token, talked.end_token, talked.num_units) == (6, 8, 2)
    assert talked.text == "talked about"
    assert talked.false_positive_code_ids == [p["code_org"].id]
    assert talked.compared_annotation_ids == [p["spans"]["cmp_talked"].id]


def test_compute_agreement_word_level_splits_a_span_by_its_words(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """'Hamburg and Bremen' (reference) vs. 'Hamburg' + 'Bremen': TP, FN, TP."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SPAN_WORD))

    hamburg, and_, bremen = result.segments[5:8]
    loc = p["code_loc"].id
    assert hamburg.true_positive_code_ids == [loc]
    assert and_.false_negative_code_ids == [loc]
    assert and_.compared_annotation_ids == []
    assert bremen.true_positive_code_ids == [loc]
    assert and_.reference_annotation_ids == [p["spans"]["ref_hamburg"].id]


def test_compute_agreement_sentence_segments(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Sentence 0 has two codes per side; sentences 1-2 agree and form one segment."""
    p = agreement_project
    result = _compute(client, p["project"].id, _params(p, AgreementMode.SENTENCE))

    s0, s12 = result.segments
    sentences = p["sentences"]
    per, loc, org = p["code_per"].id, p["code_loc"].id, p["code_org"].id
    assert (s0.sentence_id_start, s0.sentence_id_end) == (0, 0)
    assert s0.begin_token is None and s0.end_token is None
    assert s0.true_positive_code_ids == [per]
    assert s0.false_negative_code_ids == [loc]
    assert s0.false_positive_code_ids == [org]
    assert s0.reference_annotation_ids == sorted(
        [sentences["ref_s0_per"].id, sentences["ref_s0_loc"].id]
    )
    assert (s12.sentence_id_start, s12.sentence_id_end) == (1, 2)
    assert s12.true_positive_code_ids == [loc]
    assert s12.reference_annotation_ids == [sentences["ref_s12_loc"].id]
    assert s12.compared_annotation_ids == [sentences["cmp_s12_loc"].id]


# --- C. selection of codes, documents and annotators ---------------------------
# Only the requested codes, documents and annotators count; nothing else is hidden.


def test_compute_agreement_counts_requested_misc_code(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """'Then' is MISC in the reference only: requesting MISC adds one false negative."""
    p = agreement_project
    result = _compute(
        client,
        p["project"].id,
        _params(p, AgreementMode.SPAN_WORD, code_names=["PER", "LOC", "ORG", "MISC"]),
    )

    misc = result.code_scores[3]
    assert misc.code_id == p["code_misc"].id
    assert (misc.true_positives, misc.false_positives, misc.false_negatives) == (
        0,
        0,
        1,
    )
    assert result.confusion_matrix[3] == [0, 0, 0, 0, 1]


def test_compute_agreement_ignores_unrequested_codes_and_keeps_requested_order(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Requesting ORG, PER drops LOC and orders scores and matrix as requested."""
    p = agreement_project
    result = _compute(
        client,
        p["project"].id,
        _params(p, AgreementMode.SPAN_WORD, code_names=["ORG", "PER"]),
    )

    assert [s.code_id for s in result.code_scores] == [
        p["code_org"].id,
        p["code_per"].id,
    ]
    assert result.confusion_matrix_code_ids == [
        p["code_org"].id,
        p["code_per"].id,
        None,
    ]
    # rows / columns: ORG, PER, no code
    assert result.confusion_matrix == [
        [0, 0, 0],
        [2, 2, 0],
        [2, 0, 0],
    ]


def test_compute_agreement_with_third_user_ignores_other_annotators(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The third user only annotated 'left' as PER, so only their annotation counts."""
    p = agreement_project
    result = _compute(
        client,
        p["project"].id,
        _params(p, AgreementMode.SPAN_WORD, compared="third_user"),
    )

    per = result.code_scores[0]
    assert (per.true_positives, per.false_positives, per.false_negatives) == (0, 1, 3)
    compared_ids = {i for s in result.segments for i in s.compared_annotation_ids}
    assert compared_ids == {p["spans"]["third_left"].id}


def test_compute_agreement_of_annotator_with_themself_is_perfect(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Comparing the reference with itself: every unit agrees, ORG has no scores."""
    p = agreement_project
    result = _compute(
        client,
        p["project"].id,
        _params(p, AgreementMode.SPAN_STRICT, compared="reference_user"),
    )

    per, loc, org = result.code_scores
    assert per.f1 == 1.0 and loc.f1 == 1.0
    assert (org.precision, org.recall, org.f1) == (None, None, None)
    assert result.total.f1 == 1.0
    assert all(s.reference_code_ids == s.compared_code_ids for s in result.segments)


def test_compute_agreement_on_document_without_annotations_is_empty(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Document B has no annotations: no units, zero counts and undefined scores."""
    p = agreement_project
    result = _compute(
        client,
        p["project"].id,
        _params(p, AgreementMode.SPAN_WORD, sdoc_names=["B"]),
    )

    assert result.num_units == 0
    assert result.segments == []
    assert result.total.true_positives == 0
    assert result.total.f1 is None
    assert result.confusion_matrix == [[0] * 4 for _ in range(4)]


def test_compute_agreement_without_codes_has_only_no_code_cell(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """An empty code selection yields an empty result with a 1x1 'no code' matrix."""
    p = agreement_project
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(update={"code_ids": []})
    result = _compute(client, p["project"].id, params)

    assert result.code_scores == []
    assert result.confusion_matrix_code_ids == [None]
    assert result.confusion_matrix == [[0]]
    assert result.segments == []


def test_compute_agreement_deduplicates_requested_ids(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Repeated document and code IDs are counted once."""
    p = agreement_project
    params = _params(p, AgreementMode.SPAN_WORD, sdoc_names=["A", "A"])
    params = params.model_copy(update={"code_ids": params.code_ids * 2})
    result = _compute(client, p["project"].id, params)

    assert len(result.code_scores) == 3
    assert result.num_units == sum(
        n for _, n in EXPECTED_SEGMENTS[AgreementMode.SPAN_WORD]
    )


# --- D. invalid input ----------------------------------------------------------
# Documents, codes and both annotators must belong to the project.


def test_compute_agreement_rejects_document_of_other_project(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """A document of another project is rejected with 400 and named in the message."""
    p = agreement_project
    other_sdoc_id = p["other_sdoc"].id
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(
        update={"sdoc_ids": [p["sdoc_a"].id, other_sdoc_id]}
    )
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert str(other_sdoc_id) in response.text


def test_compute_agreement_rejects_code_of_other_project(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """A code of another project is rejected with 400 and named in the message."""
    p = agreement_project
    other_code_id = p["other_code"].id
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(
        update={"code_ids": [p["code_per"].id, other_code_id]}
    )
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert str(other_code_id) in response.text


@pytest.mark.parametrize(
    "field,value",
    [
        # A document ID that does not exist at all is not found.
        pytest.param("sdoc_ids", [999999], id="unknown-document"),
        # A code ID that does not exist at all is not found.
        pytest.param("code_ids", [888888], id="unknown-code"),
    ],
)
def test_compute_agreement_rejects_unknown_document_or_code(
    client: TestClient,
    agreement_project: AgreementProject,
    field: str,
    value: list[int],
) -> None:
    """Unknown document and code IDs are not found (404), like everywhere in the API."""
    p = agreement_project
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(update={field: value})
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 404, response.text


@pytest.mark.parametrize(
    "side",
    [
        # The gold standard must be a member of the project.
        pytest.param("reference_user_id", id="reference"),
        # The compared annotator must be a member of the project.
        pytest.param("compared_user_id", id="compared"),
    ],
)
def test_compute_agreement_rejects_annotator_outside_the_project(
    client: TestClient, agreement_project: AgreementProject, side: str
) -> None:
    """An existing user who is no member of the project is rejected with 400."""
    p = agreement_project
    outsider_id = p["outsider_user"].id
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(update={side: outsider_id})
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert str(outsider_id) in response.text


def test_compute_agreement_rejects_unknown_annotator_like_an_outsider(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """A user ID that does not exist gets the same 400, so IDs cannot be probed."""
    p = agreement_project
    params = _params(p, AgreementMode.SPAN_WORD).model_copy(
        update={"compared_user_id": 777777}
    )
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert "777777" in response.text


def test_compute_agreement_rejects_project_of_other_users(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The test user is no member of the other project (403)."""
    p = agreement_project
    response = client.post(
        "/agreement/compute",
        params={"project_id": p["other_project"].id},
        json=_params(p, AgreementMode.SPAN_WORD).model_dump(mode="json"),
    )
    assert response.status_code == 403, response.text


def test_compute_agreement_rejects_unknown_mode(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """A mode outside AgreementMode fails validation (422)."""
    p = agreement_project
    body = _params(p, AgreementMode.SPAN_WORD).model_dump(mode="json")
    body["mode"] = "paragraph"
    response = client.post(
        "/agreement/compute", params={"project_id": p["project"].id}, json=body
    )
    assert response.status_code == 422, response.text
