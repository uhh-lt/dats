from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from modules.statistics.statistics_dto import (
    CodeStatisticsRequest,
    SpanEntityStat,
    TagStat,
    TagStatisticsRequest,
)

# ===========================================================================
# CODE STATISTICS (/projects/{project_id}/code-statistics) TESTS
# ===========================================================================


def _code_stats(
    client: TestClient, project_id: int, code_id: int, sdoc_ids: list[int]
) -> list[SpanEntityStat]:
    response = client.post(
        f"/projects/{project_id}/code-statistics",
        json=CodeStatisticsRequest(code_id=code_id, sdoc_ids=sdoc_ids).model_dump(
            mode="json"
        ),
    )
    assert response.status_code == 200, response.text
    return [SpanEntityStat.model_validate(stat) for stat in response.json()]


def test_code_statistics_count_the_span_texts_of_the_code(
    client: TestClient, tenants: TwoTenants
) -> None:
    """The span "Alpha <p>" of the own code is counted once in the document and in
    the project; the document of the other project adds nothing."""
    own, foreign = tenants["own"], tenants["foreign"]
    p = own["project"].id

    stats = _code_stats(client, p, own["code"].id, [own["sdoc"].id, foreign["sdoc"].id])

    assert stats == [
        SpanEntityStat(
            code_id=own["code"].id,
            span_text=f"Alpha {p}",
            filtered_count=1,
            global_count=1,
        )
    ]


def test_code_statistics_of_a_code_of_another_project_match_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    """The code filter is matched within the path's project only."""
    own, foreign = tenants["own"], tenants["foreign"]

    stats = _code_stats(
        client, own["project"].id, foreign["code"].id, [foreign["sdoc"].id]
    )

    assert stats == []


def test_code_statistics_of_no_documents_are_empty(
    client: TestClient, tenants: TwoTenants
) -> None:
    own = tenants["own"]

    assert _code_stats(client, own["project"].id, own["code"].id, []) == []


# ===========================================================================
# TAG STATISTICS (/projects/{project_id}/tag-statistics) TESTS
# ===========================================================================


def _tag_stats(
    client: TestClient, project_id: int, sdoc_ids: list[int]
) -> list[TagStat]:
    response = client.post(
        f"/projects/{project_id}/tag-statistics",
        json=TagStatisticsRequest(sdoc_ids=sdoc_ids).model_dump(mode="json"),
    )
    assert response.status_code == 200, response.text
    return [TagStat.model_validate(stat) for stat in response.json()]


def test_tag_statistics_count_the_tags_of_the_documents_of_the_project(
    client: TestClient, tenants: TwoTenants
) -> None:
    """ "Tag <p>" is linked to the own document once; the tagged document of the
    other project is not counted, neither filtered nor globally."""
    own, foreign = tenants["own"], tenants["foreign"]

    stats = _tag_stats(client, own["project"].id, [own["sdoc"].id, foreign["sdoc"].id])

    assert [(s.tag.id, s.filtered_count, s.global_count) for s in stats] == [
        (own["tag"].id, 1, 1)
    ]


def test_tag_statistics_of_documents_of_another_project_match_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    own, foreign = tenants["own"], tenants["foreign"]

    assert _tag_stats(client, own["project"].id, [foreign["sdoc"].id]) == []
