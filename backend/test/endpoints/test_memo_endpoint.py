from uuid import uuid4

from fastapi.testclient import TestClient
from test.factories.code_factory import CodeFactory
from test.factories.memo_factory import MemoFactory
from test.factories.project_factory import ProjectFactory
from test.factories.sentence_annotation_factory import SentenceAnnotationFactory
from test.factories.source_document_factory import SourceDocumentFactory

from common.doc_type import DocType
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.code.code_dto import CodeCreate
from core.doc.source_document_dto import SourceDocumentCreate
from core.memo.memo_dto import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoRead,
    MemoUpdate,
)
from core.user.user_dto import UserRead


def test_add_memo_to_code(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    attached_code = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks": [{"type": "paragraph", "data": {"text": "This is content."}}]}',
        starred=True,
    )
    response = client.put(
        f"/memo?attached_object_id={attached_code.id}&attached_object_type={AttachedObjectType.code.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert response.status_code == 200
    memo = MemoRead.model_validate(response.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == attached_code.id


def test_add_memo_to_code_attached_not_existing(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    non_existing_code_id = 99999
    payload = MemoCreate(
        title="Should fail",
        content="No code exists",
        content_json='{"blocks": []}',
        starred=False,
    )

    response = client.put(
        f"/memo?attached_object_id={non_existing_code_id}&attached_object_type={AttachedObjectType.code.value}",
        json=payload.model_dump(exclude_none=True),
    )
    assert response.status_code == 404


def test_add_memo_to_source_document(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="Source Document",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks": [{"type": "paragraph", "data": {"text": "This is content."}}]}',
        starred=True,
    )

    response = client.put(
        f"/memo?attached_object_id={sdoc.id}"
        f"&attached_object_type={AttachedObjectType.source_document.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert response.status_code == 200
    memo = MemoRead.model_validate(response.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == sdoc.id
    assert memo.attached_object_type == AttachedObjectType.source_document


# add to annotation, add to doc? ...


def test_add_memo_to_sentence_annotation(
    client: TestClient,
    project_factory: ProjectFactory,
    source_document_factory: SourceDocumentFactory,
    code_factory: CodeFactory,
    sentence_annotation_factory: SentenceAnnotationFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)

    sdoc = source_document_factory.create(
        create_dto=SourceDocumentCreate(
            filename="doc.txt",
            name="Document",
            doctype=DocType.text,
            project_id=project.id,
            folder_id=None,
        )
    )

    code = code_factory.create(
        create_dto=CodeCreate(
            name="A Code",
            color="Red",
            description="desc",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )

    sentence = sentence_annotation_factory.create(
        create_dto=SentenceAnnotationCreate(
            sentence_id_start=1,
            sentence_id_end=2,
            code_id=code.id,
            sdoc_id=sdoc.id,
        ),
        user_id=test_user.id,
    )

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks":[{"type":"paragraph","data":{"text":"This is content."}}]}',
        starred=True,
    )

    resp = client.put(
        f"/memo?attached_object_id={sentence.id}"
        f"&attached_object_type={AttachedObjectType.sentence_annotation.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200
    memo = MemoRead.model_validate(resp.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == sentence.id
    assert memo.attached_object_type == AttachedObjectType.sentence_annotation

    payload = MemoCreate(
        title="First Memo Test",
        content="This is the content of the first test memo.",
        content_json='{"blocks":[{"type":"paragraph","data":{"text":"This is content."}}]}',
        starred=True,
    )

    resp = client.put(
        f"/memo?attached_object_id={sentence.id}"
        f"&attached_object_type={AttachedObjectType.sentence_annotation.value}",
        json=payload.model_dump(exclude_none=True),
    )

    assert resp.status_code == 200
    memo = MemoRead.model_validate(resp.json())
    assert memo.title == payload.title
    assert memo.user_id == test_user.id
    assert memo.attached_object_id == sentence.id
    assert memo.attached_object_type == AttachedObjectType.sentence_annotation


def test_get_by_id(
    client: TestClient,
    memo_factory: MemoFactory,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    memo_title = "Memo to Retrieve"
    memo = memo_factory.create(
        create_dto=MemoCreateIntern(
            project_id=project.id,
            user_id=test_user.id,
            title=memo_title,
            content="Content for retrieval test",
            content_json='{"blocks": []}',
            uuid=str(uuid4()),
        ),
        attached_object_id=project.id,
        attached_object_type=AttachedObjectType.project,
    )

    response = client.get(f"/memo/{memo.id}")

    assert response.status_code == 200
    memo_read = MemoRead.model_validate(response.json())

    assert memo_read.id == memo.id
    assert memo_read.title == memo_title


def test_get_by_id_not_existing(client: TestClient):
    non_existing_memo_id = 99999

    resp = client.get(f"/memo/{non_existing_memo_id}")

    assert resp.status_code == 403


# recherchieren: wie kann ich mehrere falle mit einem test abdecken?
# @pytest.fixture()


def test_update_all_fields_by_id(
    client: TestClient,
    memo_factory: MemoFactory,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    initial_title = "Initial Title"
    initial_content = "Initial content for update test"
    initial_starred = False
    memo = memo_factory.create(
        create_dto=MemoCreateIntern(
            project_id=project.id,
            user_id=test_user.id,
            title=initial_title,
            content=initial_content,
            content_json='{"blocks": []}',
            starred=initial_starred,
            uuid=str(uuid4()),
        ),
        attached_object_id=project.id,
        attached_object_type=AttachedObjectType.project,
    )

    updated_title = "New Updated Title in One Go"
    updated_content = "The content is also updated in one go"
    updated_starred = True

    update_payload_all_at_once = MemoUpdate(
        title=updated_title, content=updated_content, starred=updated_starred
    )

    response = client.patch(
        f"/memo/{memo.id}",
        json=update_payload_all_at_once.model_dump(exclude_none=True),
    )

    assert response.status_code == 200
    final_memo_state = MemoRead.model_validate(response.json())

    assert final_memo_state.id == memo.id
    assert final_memo_state.title == updated_title
    assert final_memo_state.content == updated_content
    assert final_memo_state.starred is updated_starred


def test_update_by_id_not_existing(
    client: TestClient,
):
    non_existing_memo_id = 999_999_999
    update_payload = MemoUpdate(
        title="new update",
        content="hallo World",
        starred=True,
    )
    resp = client.patch(
        f"/memo/{non_existing_memo_id}",
        json=update_payload.model_dump(exclude_none=True),
    )
    assert resp.status_code == 403


def test_delete_by_id(
    client: TestClient,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    memo_factory: MemoFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    code = code_factory.create(
        create_dto=CodeCreate(
            name="X",
            color="Red",
            description="d",
            parent_id=None,
            enabled=True,
            project_id=project.id,
            is_system=False,
        )
    )
    memo = memo_factory.create(
        create_dto=MemoCreateIntern(
            project_id=project.id,
            user_id=test_user.id,
            title="t",
            content="c",
            content_json='{"blocks":[]}',
            uuid=str(uuid4()),
        ),
        attached_object_id=code.id,
        attached_object_type=AttachedObjectType.code,
    )

    resp = client.delete(f"/memo/{memo.id}")
    assert resp.status_code == 200


def test_delete_by_id_not_existing(client: TestClient):
    non_existing_memo_id = 99999
    resp = client.delete(f"/memo/{non_existing_memo_id}")
    assert resp.status_code == 403


def test_get_memos_by_attached_object_id(
    client: TestClient,
    memo_factory: MemoFactory,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    project_id = project.id

    attached_object = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target",
            project_id=project_id,
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            is_system=False,
        )
    )

    attached_obj_id = attached_object.id
    attached_obj_type = AttachedObjectType.code
    EXPECTED_COUNT = 3

    for i in range(EXPECTED_COUNT):
        memo_factory.create(
            create_dto=MemoCreateIntern(
                project_id=project_id,
                user_id=test_user.id,
                title=f"Memo {i}",
                content=f"Content {i}",
                content_json='{"blocks": []}',
                uuid=str(uuid4()),
            ),
            attached_object_id=attached_obj_id,
            attached_object_type=attached_obj_type,
        )

    response = client.get(
        f"/memo/attached_obj/{attached_obj_type.value}/to/{attached_obj_id}"
    )

    assert response.status_code == 200
    memos_json = response.json()
    assert len(memos_json) == EXPECTED_COUNT


def test_get_memos_by_attached_object_id_not_existing(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_code_id = 99999

    resp = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{non_existing_code_id}"
    )
    assert resp.status_code == 404


def test_get_user_memo_by_attached_object_id(
    client: TestClient,
    memo_factory: MemoFactory,
    project_factory: ProjectFactory,
    code_factory: CodeFactory,
    test_user: UserRead,
):
    project = project_factory.create(creating_user_id=test_user.id)
    project_id = project.id

    attached_object = code_factory.create(
        create_dto=CodeCreate(
            name="Memo Target Code",
            color="Blue",
            description="Code for memo test",
            parent_id=None,
            enabled=True,
            project_id=project_id,
            is_system=False,
        )
    )

    attached_obj_id = attached_object.id
    attached_obj_type = AttachedObjectType.code
    expected_title = "My Unique Memo"

    memo_factory.create(
        create_dto=MemoCreateIntern(
            project_id=project_id,
            user_id=test_user.id,
            title=expected_title,
            content="Some test content",
            content_json='{"blocks": []}',
            uuid=str(uuid4()),
        ),
        attached_object_id=attached_obj_id,
        attached_object_type=attached_obj_type,
    )

    response = client.get(
        f"/memo/attached_obj/{attached_obj_type.value}/to/{attached_obj_id}/user"
    )

    assert response.status_code == 200
    memo_read = MemoRead.model_validate(response.json())

    assert memo_read.title == expected_title
    assert memo_read.user_id == test_user.id
    assert memo_read.attached_object_id == attached_obj_id
    assert memo_read.attached_object_type == attached_obj_type


def test_get_user_memo_by_attached_object_id_not_existing(
    client: TestClient,
    project_factory: ProjectFactory,
    test_user: UserRead,
):
    project_factory.create(creating_user_id=test_user.id)
    non_existing_code_id = 999999

    resp = client.get(
        f"/memo/attached_obj/{AttachedObjectType.code.value}/to/{non_existing_code_id}/user"
    )
    assert resp.status_code == 404
