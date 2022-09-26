from pathlib import Path
from typing import Any

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

import_uploaded_archive = "app.docprepro.archive.preprocess.import_uploaded_archive"


def import_uploaded_archive_apply_async(temporary_archive_file_path: Path,
                                        project_id: int) -> Any:
    archive_preprocessing = (
        Signature(import_uploaded_archive,
                  kwargs={"temporary_archive_file_path": temporary_archive_file_path, "project_id": project_id})
    )
    return archive_preprocessing.apply_async()
