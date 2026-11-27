from fastapi.testclient import TestClient

from composite_keys_test_utils import TwoTenants
from modules.document_sampler.document_sampler_dto import (
    DocumentSampleRequest,
    SampledSdocsResults,
)

# ===========================================================================
# SAMPLE BY TAGS (/projects/{project_id}/document-samples) TESTS
# ===========================================================================


def _sample(
    client: TestClient, project_id: int, tag_groups: list[list[int]]
) -> list[SampledSdocsResults]:
    response = client.post(
        f"/projects/{project_id}/document-samples",
        json=DocumentSampleRequest(tag_groups=tag_groups, n=1, frac=1.0).model_dump(
            mode="json"
        ),
    )
    assert response.status_code == 200, response.text
    return [SampledSdocsResults.model_validate(result) for result in response.json()]


def test_sample_by_tags_groups_the_documents_of_the_project(
    client: TestClient, tenants: TwoTenants
) -> None:
    """One group with the tags of both projects: only the own tagged document is
    sampled, under the own tag."""
    own, foreign = tenants["own"], tenants["foreign"]
    sdoc_id = own["sdoc"].id

    results = _sample(client, own["project"].id, [[own["tag"].id, foreign["tag"].id]])

    assert results == [
        SampledSdocsResults(
            tags=[own["tag"].id],
            sdocs=[sdoc_id],
            sample_fixed=[sdoc_id],
            sample_relative=[sdoc_id],
        )
    ]


def test_sample_by_tags_of_another_project_matches_nothing(
    client: TestClient, tenants: TwoTenants
) -> None:
    own, foreign = tenants["own"], tenants["foreign"]

    assert _sample(client, own["project"].id, [[foreign["tag"].id]]) == []
