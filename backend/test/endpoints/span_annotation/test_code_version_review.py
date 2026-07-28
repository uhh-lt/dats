import pytest

from core.annotation.annotation_dashboard_service import annotation_dashboard_service
from core.annotation.annotation_review_dto import (
    AnnotationReviewAction,
    AnnotationReviewType,
)
from core.annotation.annotation_review_service import annotation_review_service
from core.code.code_branch_crud import crud_code_branch
from core.code.code_branch_dto import CodeBranchCreate
from core.code.code_dto import (
    CodeChangeKind,
    CodeDelete,
    CodeDeleteStrategy,
    CodeMerge,
    CodeUpdate,
)
from core.code.code_service import CodeMergeConflictError, code_service


def test_main_update_is_append_only_and_annotation_requires_review(
    db_session, test_user, project_with_span_annotation
):
    old_code = project_with_span_annotation["code"]
    annotation = project_with_span_annotation["span_annotation"]

    new_code = code_service.update(
        db_session,
        code_id=old_code.id,
        update_dto=CodeUpdate(description="Revised definition"),
        author_id=test_user.id,
    )
    db_session.refresh(old_code)
    total, reviews = annotation_review_service.list_reviews(
        db_session,
        project_id=old_code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
    )

    assert new_code.id != old_code.id
    assert new_code.concept_id == old_code.concept_id
    assert old_code.is_active is False
    assert annotation.code_id == old_code.id
    assert total == 1
    assert reviews[0].assigned_code.id == old_code.id
    assert reviews[0].current_code is not None
    assert reviews[0].current_code.id == new_code.id


def test_review_can_update_annotation_to_current_main(
    db_session, test_user, project_with_span_annotation
):
    old_code = project_with_span_annotation["code"]
    annotation = project_with_span_annotation["span_annotation"]
    current = code_service.update(
        db_session,
        code_id=old_code.id,
        update_dto=CodeUpdate(name="Renamed code"),
        author_id=test_user.id,
    )

    annotation_review_service.resolve(
        db_session,
        project_id=old_code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        annotation_id=annotation.id,
        action=AnnotationReviewAction.UPDATE_CURRENT,
        replacement_code_id=None,
    )
    db_session.refresh(annotation)

    assert annotation.code_id == current.id
    total, _ = annotation_review_service.list_reviews(
        db_session,
        project_id=old_code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
    )
    assert total == 0


def test_review_is_derived_from_selected_branch(
    db_session, test_user, project_with_span_annotation
):
    main_code = project_with_span_annotation["code"]
    annotation = project_with_span_annotation["span_annotation"]
    branch = crud_code_branch.create_for_user(
        db_session,
        create_dto=CodeBranchCreate(
            project_id=main_code.project_id, name="Review context"
        ),
        user_id=test_user.id,
    )
    branch_code = code_service.update(
        db_session,
        code_id=main_code.id,
        update_dto=CodeUpdate(branch_id=branch.id, name="Branch name"),
        author_id=test_user.id,
    )

    main_total, _ = annotation_review_service.list_reviews(
        db_session,
        project_id=main_code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
    )
    branch_total, branch_reviews = annotation_review_service.list_reviews(
        db_session,
        project_id=main_code.project_id,
        branch_id=branch.id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
    )

    assert main_total == 0
    assert branch_total == 1
    assert branch_reviews[0].assigned_code.id == main_code.id
    assert branch_reviews[0].current_code is not None
    assert branch_reviews[0].current_code.id == branch_code.id

    annotation_review_service.resolve(
        db_session,
        project_id=main_code.project_id,
        branch_id=branch.id,
        annotation_type=AnnotationReviewType.SPAN,
        annotation_id=annotation.id,
        action=AnnotationReviewAction.UPDATE_CURRENT,
        replacement_code_id=None,
    )
    db_session.refresh(annotation)

    assert annotation.code_id == branch_code.id


def test_branch_merge_and_stale_main_conflict(
    db_session, test_user, project_with_span_annotation
):
    main_code = project_with_span_annotation["code"]
    branch = crud_code_branch.create_for_user(
        db_session,
        create_dto=CodeBranchCreate(
            project_id=main_code.project_id, name="Alternative codebook"
        ),
        user_id=test_user.id,
    )
    branch_code = code_service.update(
        db_session,
        code_id=main_code.id,
        update_dto=CodeUpdate(branch_id=branch.id, description="Branch definition"),
        author_id=test_user.id,
    )
    code_service.update(
        db_session,
        code_id=main_code.id,
        update_dto=CodeUpdate(description="Concurrent Main definition"),
        author_id=test_user.id,
    )

    changes = code_service.read_branch_changes(db_session, branch_id=branch.id)

    assert len(changes) == 1
    assert changes[0].branch_code.id == branch_code.id
    assert changes[0].base_main_code is not None
    assert changes[0].base_main_code.id == main_code.id
    assert changes[0].is_conflict is True

    with pytest.raises(CodeMergeConflictError) as error:
        code_service.merge(
            db_session,
            branch_id=branch.id,
            merge_dto=CodeMerge(concept_ids=[branch_code.concept_id]),
            author_id=test_user.id,
        )

    assert error.value.concept_ids == [branch_code.concept_id]


def test_merge_promotes_annotations_using_the_exact_branch_snapshot(
    db_session, test_user, project_with_span_annotation
):
    main_code = project_with_span_annotation["code"]
    annotation = project_with_span_annotation["span_annotation"]
    branch = crud_code_branch.create_for_user(
        db_session,
        create_dto=CodeBranchCreate(
            project_id=main_code.project_id, name="Annotation promotion"
        ),
        user_id=test_user.id,
    )
    branch_code = code_service.update(
        db_session,
        code_id=main_code.id,
        update_dto=CodeUpdate(branch_id=branch.id, name="Branch code"),
        author_id=test_user.id,
    )
    annotation.code = branch_code
    db_session.add(annotation)
    db_session.flush()

    merged, discarded = code_service.merge(
        db_session,
        branch_id=branch.id,
        merge_dto=CodeMerge(concept_ids=[branch_code.concept_id]),
        author_id=test_user.id,
    )
    db_session.refresh(annotation)
    db_session.refresh(branch_code)

    assert discarded == []
    assert len(merged) == 1
    assert merged[0].branch_id is None
    assert merged[0].concept_id == branch_code.concept_id
    assert branch_code.is_active is False
    assert annotation.code_id == merged[0].id


def test_changelog_is_grouped_paginated_and_scoped_to_selected_codebook(
    db_session, test_user, project_with_span_annotation
):
    main_code = project_with_span_annotation["code"]
    branch = crud_code_branch.create_for_user(
        db_session,
        create_dto=CodeBranchCreate(
            project_id=main_code.project_id, name="Changelog branch"
        ),
        user_id=test_user.id,
    )
    branch_code = code_service.update(
        db_session,
        code_id=main_code.id,
        update_dto=CodeUpdate(
            branch_id=branch.id,
            name="Branch changelog name",
            commit_message="Clarify branch code",
        ),
        author_id=test_user.id,
    )

    _, main_entries = code_service.changelog(
        db_session,
        project_id=main_code.project_id,
        branch_id=None,
        page=1,
        page_size=100,
    )
    branch_total, branch_entries = code_service.changelog(
        db_session,
        project_id=main_code.project_id,
        branch_id=branch.id,
        page=1,
        page_size=100,
    )

    assert all(
        entry.change_set_id != branch_code.change_set_id for entry in main_entries
    )
    branch_entry = next(
        entry
        for entry in branch_entries
        if entry.change_set_id == branch_code.change_set_id
    )
    assert branch_entry.change_kind == CodeChangeKind.UPDATE
    assert branch_entry.message == "Clarify branch code"
    assert branch_entry.branch_id == branch.id
    assert branch_entry.source_branch_id is None
    assert len(branch_entry.changes) == 1
    assert branch_entry.changes[0].before is not None
    assert branch_entry.changes[0].before.id == main_code.id
    assert branch_entry.changes[0].after.id == branch_code.id

    merged, _ = code_service.merge(
        db_session,
        branch_id=branch.id,
        merge_dto=CodeMerge(
            concept_ids=[branch_code.concept_id],
            commit_message="Promote clarified code",
        ),
        author_id=test_user.id,
    )
    total, first_page = code_service.changelog(
        db_session,
        project_id=main_code.project_id,
        branch_id=branch.id,
        page=1,
        page_size=1,
    )

    assert total == branch_total + 1
    assert len(first_page) == 1
    merge_entry = first_page[0]
    assert merge_entry.change_kind == CodeChangeKind.MERGE
    assert merge_entry.message == "Promote clarified code"
    assert merge_entry.branch_id is None
    assert merge_entry.source_branch_id == branch.id
    assert merge_entry.changes[0].before is not None
    assert merge_entry.changes[0].before.id == main_code.id
    assert merge_entry.changes[0].after.id == merged[0].id
    assert merge_entry.changes[0].merged_from is not None
    assert merge_entry.changes[0].merged_from.id == branch_code.id


def test_tombstone_preserves_annotation_and_requires_review(
    db_session, test_user, project_with_span_annotation
):
    code = project_with_span_annotation["code"]
    annotation = project_with_span_annotation["span_annotation"]

    tombstones = code_service.tombstone(
        db_session,
        code_id=code.id,
        delete_dto=CodeDelete(strategy=CodeDeleteStrategy.CASCADE),
        author_id=test_user.id,
    )
    total, reviews = annotation_review_service.list_reviews(
        db_session,
        project_id=code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
    )

    assert tombstones[-1].is_deleted is True
    assert annotation.code_id == code.id
    assert total == 1
    assert reviews[0].current_code is None


def test_review_filter_and_recent_documents(
    db_session, test_user, project_with_span_annotation
):
    code = project_with_span_annotation["code"]
    code_service.update(
        db_session,
        code_id=code.id,
        update_dto=CodeUpdate(description="Revised definition"),
        author_id=test_user.id,
    )

    total, reviews = annotation_review_service.list_reviews(
        db_session,
        project_id=code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
        user_id=test_user.id,
    )
    other_total, _ = annotation_review_service.list_reviews(
        db_session,
        project_id=code.project_id,
        annotation_type=AnnotationReviewType.SPAN,
        page=1,
        page_size=50,
        user_id=-1,
    )
    recent_documents = annotation_dashboard_service.recent_documents(
        db_session,
        project_id=code.project_id,
        user_id=test_user.id,
        limit=10,
    )

    assert total == 1
    assert len(reviews) == 1
    assert other_total == 0
    assert len(recent_documents) == 1
    assert recent_documents[0].document.id == reviews[0].annotation.sdoc_id
    assert recent_documents[0].annotation_count == 1


def test_read_historical_snapshots_in_batch(
    db_session, test_user, project_with_span_annotation
):
    old_code = project_with_span_annotation["code"]
    current_code = code_service.update(
        db_session,
        code_id=old_code.id,
        update_dto=CodeUpdate(name="Current name"),
        author_id=test_user.id,
    )

    snapshots = code_service.read_snapshots(
        db_session,
        project_id=old_code.project_id,
        code_ids=[old_code.id, current_code.id, old_code.id],
    )

    assert [snapshot.id for snapshot in snapshots] == [old_code.id, current_code.id]
