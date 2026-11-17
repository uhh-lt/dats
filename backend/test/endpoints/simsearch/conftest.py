from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.source_document_orm import SourceDocumentORM
from core.doc_processing.sentence_embeddings.sentence_embedding_crud import (
    crud_sentence_embedding,
)
from core.doc_processing.sentence_embeddings.sentence_embedding_dto import (
    SentenceObjectIdentifier,
)
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    FeaturelessProject,
    _create_sdoc,
    create_featureless_project,
    minimal_image_steps,
    minimal_text_steps,
)
from modules.simsearch.image_embedding_crud import crud_image_embedding
from modules.simsearch.image_embedding_dto import ImageObjectIdentifier
from repos.vector.weaviate_repo import WeaviateRepo


@pytest.fixture(scope="function")
def featureless_project(db_session, test_user: UserORM) -> FeaturelessProject:
    """
    This fixture sets up the following project, in addition to `test_project`
    (which enables the features that are on by default):

    - project: "Featureless Project" of `test_user`, without any enabled feature
    - sdoc: text document "text_done.txt" in it, with the steps of a project
      without features finished
    """
    return create_featureless_project(db_session, test_user)


class SimSearchProject(TypedDict):
    """
    This fixture sets up the following documents in `test_project` (which
    enables semantic search):

    - text document `text` "text.txt" with the text of `SDOC_SENTENCES` ("Hello
      world." and "The cat sits on the mat."); sentence 0 has the sentence
      embedding [1, 0], sentence 1 [0, 1]
    - image document `image` "image.png" (an 8x8 red PNG) with the image
      embedding [1, 0]

    Non-obvious derived behavior:

    - The search queries are embedded by the CLIP model of Ray, which the tests
      replace: a text query embeds to [1, 0], so sentence 0 is the best hit.
    """

    project: ProjectORM
    text: SourceDocumentORM
    image: SourceDocumentORM


@pytest.fixture(scope="function")
def simsearch_project(
    db_session: Session, test_project: ProjectORM
) -> SimSearchProject:
    """See `SimSearchProject`."""
    text = _create_sdoc(
        db_session,
        test_project,
        name="text.txt",
        doctype=DocType.text,
        status=dict.fromkeys(minimal_text_steps(), 1),
    )
    image = _create_sdoc(
        db_session,
        test_project,
        name="image.png",
        doctype=DocType.image,
        status=dict.fromkeys(minimal_image_steps(), 1),
    )
    client = WeaviateRepo().get_client()
    crud_sentence_embedding.create_multi(
        client=client,
        project_id=test_project.id,
        ids=[
            SentenceObjectIdentifier(sdoc_id=text.id, sentence_id=i) for i in range(2)
        ],
        embeddings=[[1.0, 0.0], [0.0, 1.0]],
    )
    crud_image_embedding.create(
        client=client,
        project_id=test_project.id,
        id=ImageObjectIdentifier(sdoc_id=image.id),
        embedding=[1.0, 0.0],
    )
    db_session.commit()
    return {"project": test_project, "text": text, "image": image}
