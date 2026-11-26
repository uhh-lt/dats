import time
from pathlib import Path

from repos.filesystem.file_crud_base import FileCRUDBase
from systems.job_system.job_system_enum import JobTiming

# How long an export is kept: as long as the result of the export job
EXPORT_TTL = JobTiming.TEN_MINUTES


class CRUDExportFile(FileCRUDBase):
    """The exports of a project, one folder per export:
    `exports/<export_id>/<file>`, below the project folder, so that the content
    access check covers them. The export job uses its job id, the other exports
    a new id. Writing an export deletes the project's expired exports."""

    folder = "exports"
    owner = None

    ### WRITE OPERATIONS ###

    def write(self, *, project_id: int, id: int | str, name: str, data: bytes) -> Path:
        self.delete_expired(project_id=project_id)
        return super().write(project_id=project_id, id=id, name=name, data=data)

    def move_in(
        self, *, project_id: int, id: int | str, src: Path, name: str | None = None
    ) -> Path:
        self.delete_expired(project_id=project_id)
        return super().move_in(project_id=project_id, id=id, src=src, name=name)

    ### DELETE OPERATIONS ###

    def delete_expired(self, *, project_id: int) -> None:
        """Deletes the exports of the project older than `EXPORT_TTL`."""
        oldest = time.time() - EXPORT_TTL
        for id in self.ids(project_id=project_id):
            if self.dir(project_id=project_id, id=id).stat().st_mtime < oldest:
                self.delete(project_id=project_id, id=id)


crud_export_file = CRUDExportFile()
