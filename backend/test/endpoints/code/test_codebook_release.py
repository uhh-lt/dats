import pytest

from core.code.code_dto import CodeCreate, CodeUpdate
from core.code.code_service import code_service
from core.code.codebook_release_dto import CodebookReleaseCreate
from core.code.codebook_release_service import (
    CodebookReleaseConflictError,
    codebook_release_service,
)


def test_releases_reuse_unchanged_snapshots_and_exclude_system_codes(
    db_session, test_user, project_with_code
):
    project = project_with_code["project"]
    code = project_with_code["code"]

    first = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="v1.0.0",
            description="First stable codebook",
        ),
    )
    second = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="1.1.0",
        ),
    )

    assert first.release.version == "1.0.0"
    assert first.release.code_count == 1
    assert first.release.previous_release_id is None
    assert all(not snapshot.is_system for snapshot in first.codes)
    assert first.codes[0].id == code.id
    assert second.codes[0].id == code.id
    assert second.release.previous_release_id == first.release.id

    comparison = codebook_release_service.compare(
        db_session,
        release_id=first.release.id,
        target_release_id=second.release.id,
    )

    assert comparison.unchanged_count == 1
    assert comparison.added_count == 0
    assert comparison.modified_count == 0
    assert comparison.removed_count == 0
    assert comparison.changes == []


def test_release_comparison_with_another_release_and_latest_main(
    db_session, test_user, project_with_code
):
    project = project_with_code["project"]
    original = project_with_code["code"]
    first = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="1.0.0",
        ),
    )
    updated = code_service.update(
        db_session,
        code_id=original.id,
        update_dto=CodeUpdate(name="Updated release code"),
        author_id=test_user.id,
    )
    second = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="1.1.0-beta.1+test",
        ),
    )
    added = code_service.create(
        db_session,
        create_dto=CodeCreate(
            project_id=project.id,
            name="Added after release",
            color="#123456",
            is_system=False,
        ),
        author_id=test_user.id,
    )

    release_comparison = codebook_release_service.compare(
        db_session,
        release_id=first.release.id,
        target_release_id=second.release.id,
    )
    latest_comparison = codebook_release_service.compare(
        db_session,
        release_id=first.release.id,
        target_release_id=None,
    )

    assert release_comparison.modified_count == 1
    assert release_comparison.changes[0].before is not None
    assert release_comparison.changes[0].before.id == original.id
    assert release_comparison.changes[0].after is not None
    assert release_comparison.changes[0].after.id == updated.id
    assert latest_comparison.target_is_latest is True
    assert latest_comparison.modified_count == 1
    assert latest_comparison.added_count == 1
    assert {
        change.after.id for change in latest_comparison.changes if change.after
    } == {
        updated.id,
        added.id,
    }


def test_release_versions_are_unique_per_project(db_session, project_with_code):
    project = project_with_code["project"]
    create = CodebookReleaseCreate(project_id=project.id, version="2.0.0")
    codebook_release_service.create(db_session, create_dto=create)

    with pytest.raises(CodebookReleaseConflictError):
        codebook_release_service.create(db_session, create_dto=create)


def test_release_list_searches_before_pagination_and_keeps_real_predecessor(
    db_session, project_with_code
):
    project = project_with_code["project"]
    first = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="1.0.0",
            description="Initial qualitative codebook",
        ),
    )
    second = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="1.1.0",
            description="Intermediary cleanup",
        ),
    )
    third = codebook_release_service.create(
        db_session,
        create_dto=CodebookReleaseCreate(
            project_id=project.id,
            version="2.0.0",
            description="Publication codebook",
        ),
    )

    total, releases = codebook_release_service.list_by_project(
        db_session,
        project_id=project.id,
        page=1,
        page_size=1,
        query="publication",
    )

    assert total == 1
    assert [release.id for release in releases] == [third.release.id]
    assert releases[0].previous_release_id == second.release.id
    assert second.release.previous_release_id == first.release.id
