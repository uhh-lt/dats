from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

from modules.agreement.agreement_dto import AgreementParams
from modules.agreement.agreement_enum import AgreementAnnotationType, AgreementScoring
from repos.filesystem_repo import FilesystemRepo

from .conftest import AgreementProject

CSV_COLUMNS = [
    "annotation_type",
    "scoring",
    "reference_user_id",
    "reference_user",
    "compared_user_id",
    "compared_user",
    "sdoc_id",
    "sdoc_name",
    "code_id",
    "code_name",
    "true_positives",
    "false_positives",
    "false_negatives",
]


# ===========================================================================
# EXPORT AGREEMENT COUNTS (/agreement/export_counts) TESTS
# ===========================================================================


def _params(p: AgreementProject) -> AgreementParams:
    """Span annotations, scored per word."""
    return AgreementParams(
        sdoc_ids=[p["sdoc_a"].id, p["sdoc_b"].id],
        code_ids=[p["code_per"].id, p["code_loc"].id, p["code_org"].id],
        reference_user_id=p["reference_user"].id,
        compared_user_id=p["compared_user"].id,
        annotation_type=AgreementAnnotationType.SPAN,
        scoring=AgreementScoring.CONSTITUENTS,
    )


def _export(
    client: TestClient, project_id: int, params: AgreementParams
) -> pd.DataFrame:
    response = client.post(
        "/agreement/export_counts",
        params={"project_id": project_id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    filename = Path(response.json()).name
    assert filename.endswith(".csv")
    return pd.read_csv(FilesystemRepo().get_dst_path_for_temp_file(filename))


def test_export_agreement_counts_has_a_row_per_document_and_code(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Every requested (document, code) pair is a row, also document B with zeros."""
    p = agreement_project
    df = _export(client, p["project"].id, _params(p))

    assert list(df.columns) == CSV_COLUMNS
    assert list(zip(df["sdoc_name"], df["code_name"])) == [
        ("Document A", "Human"),
        ("Document A", "Place"),
        ("Document A", "Company"),
        ("Document B", "Human"),
        ("Document B", "Place"),
        ("Document B", "Company"),
    ]
    assert set(df["annotation_type"]) == {"span"}
    assert set(df["scoring"]) == {"constituents"}
    assert set(df["reference_user"]) == {"Test User"}
    assert set(df["compared_user"]) == {"Compared Annotator"}
    assert set(df["compared_user_id"]) == {p["compared_user"].id}


def test_export_agreement_counts_matches_the_computed_counts(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """Document A has the word level counts of the fixture, document B only zeros."""
    p = agreement_project
    df = _export(client, p["project"].id, _params(p))

    counts = [
        tuple(row)
        for row in df[["true_positives", "false_positives", "false_negatives"]]
        .astype(int)
        .itertuples(index=False)
    ]
    assert counts == [
        (2, 0, 1),
        (3, 1, 1),
        (0, 4, 0),
        (0, 0, 0),
        (0, 0, 0),
        (0, 0, 0),
    ]


def test_export_agreement_counts_rejects_project_of_other_users(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The test user is no member of the other project (403)."""
    p = agreement_project
    response = client.post(
        "/agreement/export_counts",
        params={"project_id": p["other_project"].id},
        json=_params(p).model_dump(mode="json"),
    )
    assert response.status_code == 403, response.text


def test_export_agreement_counts_rejects_annotator_outside_the_project(
    client: TestClient, agreement_project: AgreementProject
) -> None:
    """The CSV holds annotator names, so a non-member is rejected (400) before export."""
    p = agreement_project
    params = _params(p).model_copy(update={"compared_user_id": p["outsider_user"].id})
    response = client.post(
        "/agreement/export_counts",
        params={"project_id": p["project"].id},
        json=params.model_dump(mode="json"),
    )
    assert response.status_code == 400, response.text
    assert "Outside" not in response.text
