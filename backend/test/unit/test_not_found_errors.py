from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from common.common_exceptions import NotFoundError
from common.exception_handler import exception_handlers
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.source_document_orm import SourceDocumentORM
from repos.db.sql_exceptions import NoSuchElementError
from repos.elastic.elastic_exceptions import NoSuchObjectInElasticSearchError
from repos.vector.weaviate_exceptions import (
    WeaviateObjectIDNotFoundException,
    WeaviateObjectIDsNotFoundException,
    WeaviateObjectUUIDNotFoundException,
)

collection = MagicMock()
collection.name = "Document"

NOT_FOUND_ERRORS: list[NotFoundError] = [
    NoSuchElementError(SourceDocumentORM, id=1),
    WeaviateObjectIDNotFoundException(
        id=DocumentObjectIdentifier(sdoc_id=1), collection=collection
    ),
    WeaviateObjectIDsNotFoundException(
        num_requested_ids=2, num_found_ids=1, collection=collection
    ),
    WeaviateObjectUUIDNotFoundException(
        uuid="00000000-0000-0000-0000-000000000000", collection=collection
    ),
    NoSuchObjectInElasticSearchError(index_name="sdoc", id=1),
]


@pytest.fixture(scope="module")
def client() -> TestClient:
    app = FastAPI()
    for ex_class, handler_func in exception_handlers:
        app.add_exception_handler(ex_class, handler_func)

    @app.get("/raise/{index}")
    def raise_error(index: int) -> None:
        raise NOT_FOUND_ERRORS[index]

    return TestClient(app, raise_server_exceptions=False)


@pytest.mark.parametrize(
    "index",
    range(len(NOT_FOUND_ERRORS)),
    ids=lambda i: type(NOT_FOUND_ERRORS[i]).__name__,
)
def test_not_found_errors_map_to_404(client: TestClient, index: int) -> None:
    error = NOT_FOUND_ERRORS[index]
    assert isinstance(error, NotFoundError)

    response = client.get(f"/raise/{index}")

    assert response.status_code == 404
    assert response.text == str(error)
