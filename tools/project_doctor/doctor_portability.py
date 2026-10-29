"""Checks for data that the project export or the project import of DATS cannot
handle, so that duplicating a project (full export + full import) works.

The export validates every entity with pydantic schemas (non-blank names,
non-negative coordinates, resolvable ids, ...) and aborts the whole export on
the first violation. The import reads the exported CSV files back with pandas,
which turns empty cells and values like "NA" or "None" into missing values, and
matches codes, tags, folders, users and metadata by name. Every check here
mirrors one of these assumptions of DATS v1.12.1 (modules/eximport)."""

import json
from collections.abc import Callable
from typing import Any

from doctor_json_repair import repair_timeline_concepts, repair_whiteboard
from doctor_report import (
    AddProjectMembers,
    CheckName,
    ClampBBoxes,
    DeleteSdocMetadata,
    Issue,
    ReattachMemos,
    RepairSdocMetadata,
    RepairSpanTexts,
    RepairTimelineFilters,
    RepairWhiteboard,
    SetParents,
    SetValues,
)
from doctor_stores import CSV_NA_VALUES, Stores
from sqlalchemy import Connection, text

# how many ids a message lists before it abbreviates
_MAX_IDS_IN_MESSAGE = 10

# a value that is NULL, empty, whitespace only, or read back as NaN from CSV
_BLANK_SQL = "({col} IS NULL OR {col} ~ '^[[:space:]]*$' OR {col} = ANY(:na))"
# a value that the CSV round trip turns into a missing value (whitespace survives)
_CSV_MISSING_SQL = "({col} IS NULL OR {col} = '' OR {col} = ANY(:na))"


def _ids_text(ids: list[int]) -> str:
    shown = ", ".join(str(i) for i in ids[:_MAX_IDS_IN_MESSAGE])
    if len(ids) > _MAX_IDS_IN_MESSAGE:
        shown += f", ... ({len(ids) - _MAX_IDS_IN_MESSAGE} more)"
    return shown


def _folder_type_is(alias: str, folder_type: str) -> str:
    # the folder type is stored as name or as value, depending on the DATS version
    return f"lower({alias}.folder_type::text) = '{folder_type}'"


class _BlankColumn:
    """A text column the export rejects when it is blank, or the import loses
    when the CSV round trip turns it into a missing value."""

    def __init__(
        self,
        table: str,
        column: str,
        label: str,
        placeholder: Callable[[int, str | None], str],
        condition: str = _BLANK_SQL,
    ) -> None:
        self.table = table
        self.column = column
        self.label = label
        self.placeholder = placeholder
        self.condition = condition


def _untitled(entity: str) -> Callable[[int, str | None], str]:
    def placeholder(row_id: int, value: str | None) -> str:
        if value is not None and value.strip() in CSV_NA_VALUES and value.strip():
            # keep the name recognizable, the id keeps it unique
            return f"{value.strip()} ({row_id})"
        return f"Untitled {entity} {row_id}"

    return placeholder


_BLANK_COLUMNS = [
    _BlankColumn("memo", "title", "memo titles", _untitled("memo")),
    _BlankColumn("whiteboard", "title", "whiteboard titles", _untitled("whiteboard")),
    _BlankColumn(
        "timelineanalysis",
        "name",
        "timeline analysis names",
        _untitled("timeline analysis"),
    ),
    _BlankColumn(
        "conceptovertimeanalysis",
        "name",
        "concept over time analysis names",
        _untitled("analysis"),
    ),
    _BlankColumn("code", "name", "code names", _untitled("code")),
    _BlankColumn("tag", "name", "tag names", _untitled("tag")),
    _BlankColumn("folder", "name", "folder names", _untitled("folder")),
    _BlankColumn(
        "projectmetadata", "key", "metadata keys", lambda i, _: f"metadata_{i}"
    ),
    _BlankColumn(
        "projectmetadata",
        "description",
        "metadata descriptions",
        lambda i, _: "No description",
    ),
    # optional in DATS, but the import rejects the empty cell the export writes;
    # a single space survives the CSV round trip and looks like no description
    _BlankColumn(
        "code",
        "description",
        "code descriptions",
        lambda i, _: " ",
        condition=_CSV_MISSING_SQL,
    ),
    _BlankColumn(
        "tag",
        "description",
        "tag descriptions",
        lambda i, _: " ",
        condition=_CSV_MISSING_SQL,
    ),
]

# the default value per metadata type, for metadata without a value
_METADATA_COLUMNS = {
    "STRING": "str_value",
    "NUMBER": "int_value",
    "BOOLEAN": "boolean_value",
    "DATE": "date_value",
    "LIST": "list_value",
}


class PortabilityChecker:
    def __init__(self, *, conn: Connection, stores: Stores) -> None:
        self.conn = conn
        self.stores = stores

    def _ids(self, sql: str, **params: Any) -> list[int]:
        return [int(i) for i in self.conn.execute(text(sql), params).scalars()]

    def _rows(self, sql: str, **params: Any) -> list[Any]:
        return list(self.conn.execute(text(sql), params).all())

    def check_project(self, project_id: int) -> list[Issue]:
        checks: list[Callable[[int], list[Issue]]] = [
            self._check_span_texts,
            self._check_blank_values,
            self._check_sdoc_html,
            self._check_folder_names,
            self._check_hierarchies,
            self._check_system_codes,
            self._check_metadata_keys,
            self._check_sdoc_metadata,
            self._check_bboxes,
            self._check_members,
            self._check_memos,
            self._check_whiteboards,
            self._check_timeline_analyses,
        ]
        issues: list[Issue] = []
        for check in checks:
            issues.extend(check(project_id))
        return issues

    # ==========================================================================
    # ANNOTATIONS
    # ==========================================================================
    def _check_span_texts(self, project_id: int) -> list[Issue]:
        ids = self._ids(
            "SELECT a.id FROM spanannotation a "
            "LEFT JOIN spantext t ON t.id = a.span_text_id "
            f"WHERE a.project_id = :pid AND {_BLANK_SQL.format(col='t.text')} "
            "ORDER BY a.id",
            pid=project_id,
            na=list(CSV_NA_VALUES),
        )
        if not ids:
            return []
        return [
            Issue(
                key=f"{CheckName.BLANK_SPAN_TEXT.value}:{project_id}",
                check=CheckName.BLANK_SPAN_TEXT,
                project_id=project_id,
                message=f"{len(ids)} span annotations have a blank text (or one the "
                f"import reads as missing, like 'NA'): {_ids_text(ids)}",
                fix=RepairSpanTexts(ids=ids),
                hint="Heal takes the text from the document. Annotations whose text "
                "is blank there as well (or reads as missing) are deleted.",
            )
        ]

    def _check_bboxes(self, project_id: int) -> list[Issue]:
        ids = self._ids(
            "SELECT id FROM bboxannotation WHERE project_id = :pid "
            "AND (x_min < 0 OR y_min < 0 OR x_max < 0 OR y_max < 0 "
            "OR x_max < x_min OR y_max < y_min) ORDER BY id",
            pid=project_id,
        )
        if not ids:
            return []
        return [
            Issue(
                key=f"{CheckName.INVALID_BBOX.value}:{project_id}",
                check=CheckName.INVALID_BBOX,
                project_id=project_id,
                message=f"{len(ids)} bbox annotations have negative or inverted "
                f"coordinates: {_ids_text(ids)}",
                fix=ClampBBoxes(ids=ids),
                hint="Heal clamps the coordinates to 0 and orders min and max.",
            )
        ]

    # ==========================================================================
    # NAMES AND VALUES
    # ==========================================================================
    def _check_blank_values(self, project_id: int) -> list[Issue]:
        issues: list[Issue] = []
        for blank in _BLANK_COLUMNS:
            rows = self._rows(
                f"SELECT id, {blank.column} FROM {blank.table} "
                f"WHERE project_id = :pid AND "
                f"{blank.condition.format(col=blank.column)} ORDER BY id",
                pid=project_id,
                na=list(CSV_NA_VALUES),
            )
            if not rows:
                continue
            values = {
                int(row[0]): blank.placeholder(int(row[0]), row[1]) for row in rows
            }
            ids = list(values)
            issues.append(
                Issue(
                    key=f"{CheckName.BLANK_VALUE.value}:{project_id}:{blank.table}.{blank.column}",
                    check=CheckName.BLANK_VALUE,
                    project_id=project_id,
                    message=f"{len(ids)} {blank.label} are blank (or read as missing "
                    f"by the import, like 'NA'): {_ids_text(ids)}",
                    fix=SetValues(
                        table=blank.table, column=blank.column, values=values
                    ),
                    hint="Heal sets the values listed in the fix.",
                )
            )
        return issues

    def _check_sdoc_html(self, project_id: int) -> list[Issue]:
        issues: list[Issue] = []
        for column in ("html", "raw_html"):
            ids = self._ids(
                "SELECT d.id FROM sourcedocumentdata d "
                "JOIN sourcedocument s ON s.id = d.id "
                f"WHERE s.project_id = :pid AND {_CSV_MISSING_SQL.format(col='d.' + column)} "
                "ORDER BY d.id",
                pid=project_id,
                na=list(CSV_NA_VALUES),
            )
            if not ids:
                continue
            issues.append(
                Issue(
                    key=f"{CheckName.EMPTY_SDOC_HTML.value}:{project_id}:{column}",
                    check=CheckName.EMPTY_SDOC_HTML,
                    project_id=project_id,
                    message=f"{len(ids)} SourceDocuments have an empty {column}, so "
                    f"the import fails on them: {_ids_text(ids)}",
                    fix=SetValues(
                        table="sourcedocumentdata",
                        column=column,
                        values={i: "<html></html>" for i in ids},
                    ),
                    hint="Their processing did not finish. Retry it in the document "
                    "health view to keep their text; heal puts an empty HTML in place.",
                )
            )
        return issues

    def _check_folder_names(self, project_id: int) -> list[Issue]:
        # the export requires unique names of normal folders in the project, and
        # the import puts documents into the first folder with their folder's name
        rows = self._rows(
            "SELECT f.id, f.name FROM folder f "
            f"WHERE f.project_id = :pid AND {_folder_type_is('f', 'normal')} AND ("
            "EXISTS (SELECT 1 FROM folder g WHERE g.project_id = f.project_id "
            f"AND g.name = f.name AND g.id < f.id AND {_folder_type_is('g', 'normal')}) "
            "OR EXISTS (SELECT 1 FROM folder g WHERE g.project_id = f.project_id "
            f"AND g.name = f.name AND {_folder_type_is('g', 'sdoc_folder')})"
            ") ORDER BY f.id",
            pid=project_id,
        )
        if not rows:
            return []
        values = {int(r.id): f"{r.name} ({r.id})" for r in rows}
        return [
            Issue(
                key=f"{CheckName.DUPLICATE_FOLDER_NAME.value}:{project_id}",
                check=CheckName.DUPLICATE_FOLDER_NAME,
                project_id=project_id,
                message=f"{len(values)} folders share their name with another folder "
                f"of the project: {', '.join(repr(r.name) for r in rows[:10])}",
                fix=SetValues(table="folder", column="name", values=values),
                hint="Heal appends the folder id to the names listed in the fix.",
            )
        ]

    def _check_hierarchies(self, project_id: int) -> list[Issue]:
        issues: list[Issue] = []
        for table in ("code", "tag", "folder"):
            rows = self._rows(
                f"SELECT c.id, c.parent_id, p.project_id AS parent_project, "
                f"{'p.folder_type::text AS parent_type, c.folder_type::text AS own_type' if table == 'folder' else 'NULL AS parent_type, NULL AS own_type'} "
                f"FROM {table} c LEFT JOIN {table} p ON p.id = c.parent_id "
                "WHERE c.project_id = :pid",
                pid=project_id,
            )
            parents = {int(r.id): r.parent_id for r in rows}
            broken: set[int] = set()
            for r in rows:
                if r.parent_id is None:
                    continue
                if r.parent_project != project_id:
                    broken.add(int(r.id))
                elif (
                    table == "folder"
                    and str(r.own_type).lower() == "normal"
                    and str(r.parent_type).lower() == "sdoc_folder"
                ):
                    broken.add(int(r.id))
            # cycles: walk up from every row; cut each cycle at its smallest id
            for start in parents:
                seen: list[int] = []
                node: int | None = start
                while node is not None and node in parents and node not in seen:
                    seen.append(node)
                    node = parents[node]
                if node is not None and node in seen:
                    cycle = seen[seen.index(node) :]
                    broken.add(min(cycle))
            if not broken:
                continue
            ids = sorted(broken)
            issues.append(
                Issue(
                    key=f"{CheckName.BROKEN_HIERARCHY.value}:{project_id}:{table}",
                    check=CheckName.BROKEN_HIERARCHY,
                    project_id=project_id,
                    message=f"{len(ids)} {table}s have a parent in another project, "
                    f"of the wrong type, or in a cycle: {_ids_text(ids)}",
                    fix=SetParents(table=table, parents={i: None for i in ids}),  # type: ignore[arg-type]
                    hint="Heal makes them root entries.",
                )
            )
        return issues

    def _check_system_codes(self, project_id: int) -> list[Issue]:
        # the import creates the system codes first and matches the imported
        # codes by name: a different parent fails, a user code is merged
        rows = self._rows(
            "SELECT id, name, parent_id, is_system FROM code WHERE project_id = :pid",
            pid=project_id,
        )
        names = {int(r.id): r.name for r in rows}
        all_names = set(names.values())
        # user codes named like a system parent are renamed, so never move to them
        system_ids_by_name = {r.name: int(r.id) for r in rows if r.is_system}
        renames: dict[int, str] = {}
        reparents: dict[int, int | None] = {}
        orphans: list[int] = []
        for r in rows:
            if r.name not in self.stores.system_code_parents:
                continue
            expected_parent = self.stores.system_code_parents[r.name]
            if not r.is_system:
                new_name = f"{r.name} (custom)"
                if new_name in all_names:
                    new_name = f"{r.name} (custom {r.id})"
                renames[int(r.id)] = new_name
                continue
            if (
                expected_parent is not None
                and expected_parent not in system_ids_by_name
            ):
                orphans.append(int(r.id))
                continue
            parent = (
                system_ids_by_name.get(expected_parent) if expected_parent else None
            )
            if r.parent_id != parent:
                reparents[int(r.id)] = parent
        issues: list[Issue] = []
        if renames:
            issues.append(
                Issue(
                    key=f"{CheckName.SYSTEM_CODE_CONFLICT.value}:{project_id}:names",
                    check=CheckName.SYSTEM_CODE_CONFLICT,
                    project_id=project_id,
                    message=f"{len(renames)} codes are named like system codes, which "
                    "the import merges into the system code or rejects: "
                    f"{', '.join(repr(names[i]) for i in list(renames)[:10])}",
                    fix=SetValues(table="code", column="name", values=renames),
                    hint="Heal renames them as listed in the fix.",
                )
            )
        if reparents:
            issues.append(
                Issue(
                    key=f"{CheckName.SYSTEM_CODE_CONFLICT.value}:{project_id}:parents",
                    check=CheckName.SYSTEM_CODE_CONFLICT,
                    project_id=project_id,
                    message=f"{len(reparents)} system codes were moved away from their "
                    "configured parent, which the import rejects: "
                    f"{', '.join(repr(names[i]) for i in list(reparents)[:10])}",
                    fix=SetParents(table="code", parents=reparents),
                    hint="Heal moves them back to their configured parent.",
                )
            )
        if orphans:
            issues.append(
                Issue(
                    key=f"{CheckName.SYSTEM_CODE_CONFLICT.value}:{project_id}:missing",
                    check=CheckName.SYSTEM_CODE_CONFLICT,
                    project_id=project_id,
                    message=f"{len(orphans)} system codes lack the system code that "
                    "is configured as their parent, which the import rejects: "
                    f"{', '.join(repr(names[i]) for i in orphans[:10])}",
                    fix=None,
                    hint="The project misses system codes. Compare its codes with "
                    "the system codes of a new project and decide manually.",
                )
            )
        return issues

    def _check_metadata_keys(self, project_id: int) -> list[Issue]:
        # the import creates the configured metadata first; an exported key with
        # the same doctype but another type violates the unique constraint
        rows = self._rows(
            "SELECT id, key, doctype, metatype FROM projectmetadata "
            "WHERE project_id = :pid",
            pid=project_id,
        )
        keys = {(r.key, r.doctype) for r in rows}
        renames: dict[int, str] = {}
        for r in rows:
            configured = self.stores.config_metadata.get((r.key, r.doctype))
            if configured is None or configured == r.metatype:
                continue
            new_key = f"{r.key} (custom)"
            if (new_key, r.doctype) in keys:
                new_key = f"{r.key} (custom {r.id})"
            renames[int(r.id)] = new_key
        if not renames:
            return []
        return [
            Issue(
                key=f"{CheckName.METADATA_KEY_CONFLICT.value}:{project_id}",
                check=CheckName.METADATA_KEY_CONFLICT,
                project_id=project_id,
                message=f"{len(renames)} metadata keys are configured by DATS with "
                f"another type, which the import rejects: {_ids_text(list(renames))}",
                fix=SetValues(table="projectmetadata", column="key", values=renames),
                hint="Heal renames them as listed in the fix.",
            )
        ]

    def _check_sdoc_metadata(self, project_id: int) -> list[Issue]:
        missing_value = " OR ".join(
            f"(pm.metatype = '{metatype}' AND m.{column} IS NULL)"
            for metatype, column in _METADATA_COLUMNS.items()
        )
        invalid = self._ids(
            "SELECT m.id FROM sourcedocumentmetadata m "
            "JOIN sourcedocument s ON s.id = m.source_document_id "
            "JOIN projectmetadata pm ON pm.id = m.project_metadata_id "
            f"WHERE s.project_id = :pid AND ({missing_value} "
            "OR (pm.metatype = 'LIST' AND array_position(m.list_value, NULL) IS NOT NULL)) "
            "ORDER BY m.id",
            pid=project_id,
        )
        mismatched = self._ids(
            "SELECT m.id FROM sourcedocumentmetadata m "
            "JOIN sourcedocument s ON s.id = m.source_document_id "
            "JOIN projectmetadata pm ON pm.id = m.project_metadata_id "
            "WHERE s.project_id = :pid AND pm.project_id = :pid "
            "AND pm.doctype <> s.doctype ORDER BY m.id",
            pid=project_id,
        )
        issues: list[Issue] = []
        if invalid:
            issues.append(
                Issue(
                    key=f"{CheckName.INVALID_SDOC_METADATA.value}:{project_id}:values",
                    check=CheckName.INVALID_SDOC_METADATA,
                    project_id=project_id,
                    message=f"{len(invalid)} document metadata have no value for their "
                    f"type, which the export rejects: {_ids_text(invalid)}",
                    fix=RepairSdocMetadata(ids=invalid),
                    hint="Heal writes the default of the type ('', 0, false, today, []) "
                    "and drops values stored in a column of another type.",
                )
            )
        if mismatched:
            issues.append(
                Issue(
                    key=f"{CheckName.INVALID_SDOC_METADATA.value}:{project_id}:doctype",
                    check=CheckName.INVALID_SDOC_METADATA,
                    project_id=project_id,
                    message=f"{len(mismatched)} document metadata belong to a key of "
                    "another document type, which the import rejects: "
                    f"{_ids_text(mismatched)}",
                    fix=DeleteSdocMetadata(ids=mismatched),
                    hint="Heal deletes them; DATS does not show them anyway.",
                )
            )
        return issues

    # ==========================================================================
    # USERS AND MEMOS
    # ==========================================================================
    def _check_members(self, project_id: int) -> list[Issue]:
        # the import assigns annotations and memos only to members of the project
        user_ids = self._ids(
            "SELECT DISTINCT u FROM ("
            "SELECT ad.user_id AS u FROM annotationdocument ad "
            "JOIN sourcedocument s ON s.id = ad.source_document_id "
            "WHERE s.project_id = :pid "
            "UNION SELECT m.user_id FROM memo m WHERE m.project_id = :pid "
            "UNION SELECT f.user_id FROM memofavoritelinktable f "
            "JOIN memo m ON m.id = f.memo_id WHERE m.project_id = :pid"
            ") authors WHERE u IS NOT NULL AND NOT EXISTS ("
            "SELECT 1 FROM projectuserlinktable l "
            "WHERE l.project_id = :pid AND l.user_id = authors.u) ORDER BY u",
            pid=project_id,
        )
        if not user_ids:
            return []
        return [
            Issue(
                key=f"{CheckName.NON_MEMBER_AUTHOR.value}:{project_id}",
                check=CheckName.NON_MEMBER_AUTHOR,
                project_id=project_id,
                message=f"{len(user_ids)} users who annotated or wrote memos are no "
                f"members of the project anymore: {_ids_text(user_ids)}",
                fix=AddProjectMembers(user_ids=user_ids),
                hint="Heal adds them to the project again.",
            )
        ]

    def _check_memos(self, project_id: int) -> list[Issue]:
        issues: list[Issue] = []
        unsupported = self._ids(
            "SELECT m.id FROM memo m JOIN objecthandle o ON o.id = m.attached_to_id "
            "WHERE m.project_id = :pid AND (o.span_group_id IS NOT NULL "
            "OR o.user_id IS NOT NULL OR o.memo_id IS NOT NULL) ORDER BY m.id",
            pid=project_id,
        )
        if unsupported:
            issues.append(
                Issue(
                    key=f"{CheckName.UNSUPPORTED_MEMO_ATTACHMENT.value}:{project_id}",
                    check=CheckName.UNSUPPORTED_MEMO_ATTACHMENT,
                    project_id=project_id,
                    message=f"{len(unsupported)} memos are attached to a span group, "
                    f"user or memo, which the export rejects: {_ids_text(unsupported)}",
                    fix=ReattachMemos(memo_ids=unsupported),
                    hint="Heal attaches them to the project.",
                )
            )

        invalid: list[int] = []
        for memo_id, content_json in self._rows(
            "SELECT id, content_json FROM memo WHERE project_id = :pid "
            "AND content_json IS NOT NULL AND content_json !~ '^[[:space:]]*$' "
            "ORDER BY id",
            pid=project_id,
        ):
            try:
                json.loads(content_json)
            except ValueError:
                invalid.append(int(memo_id))
        if invalid:
            issues.append(
                Issue(
                    key=f"{CheckName.INVALID_MEMO_CONTENT.value}:{project_id}",
                    check=CheckName.INVALID_MEMO_CONTENT,
                    project_id=project_id,
                    message=f"{len(invalid)} memos have an editor content that is no "
                    f"valid JSON, which the export rejects: {_ids_text(invalid)}",
                    fix=SetValues(
                        table="memo",
                        column="content_json",
                        values={i: "" for i in invalid},
                    ),
                    hint="Heal clears the editor content; the memo text stays.",
                )
            )
        return issues

    # ==========================================================================
    # WHITEBOARDS AND TIMELINE ANALYSES
    # ==========================================================================
    def whiteboard_references(
        self, project_id: int
    ) -> tuple[dict[str, set[int]], dict[int, int | None]]:
        """The ids whiteboard nodes may reference, and the parents of the codes."""
        valid = {
            "sdoc": set(
                self._ids(
                    "SELECT id FROM sourcedocument WHERE project_id = :pid",
                    pid=project_id,
                )
            ),
            "code": set(
                self._ids("SELECT id FROM code WHERE project_id = :pid", pid=project_id)
            ),
            "tag": set(
                self._ids("SELECT id FROM tag WHERE project_id = :pid", pid=project_id)
            ),
            "span_annotation": set(
                self._ids(
                    "SELECT id FROM spanannotation WHERE project_id = :pid",
                    pid=project_id,
                )
            ),
            "sentence_annotation": set(
                self._ids(
                    "SELECT id FROM sentenceannotation WHERE project_id = :pid",
                    pid=project_id,
                )
            ),
            "bbox_annotation": set(
                self._ids(
                    "SELECT id FROM bboxannotation WHERE project_id = :pid",
                    pid=project_id,
                )
            ),
        }
        code_parents = {
            int(r.id): r.parent_id
            for r in self._rows(
                "SELECT id, parent_id FROM code WHERE project_id = :pid", pid=project_id
            )
        }
        return valid, code_parents

    def timeline_references(self, project_id: int) -> dict[str, set[int]]:
        """The ids timeline filters may reference."""
        return {
            "tag": set(
                self._ids("SELECT id FROM tag WHERE project_id = :pid", pid=project_id)
            ),
            "code": set(
                self._ids("SELECT id FROM code WHERE project_id = :pid", pid=project_id)
            ),
            "folder": set(
                self._ids(
                    "SELECT f.id FROM folder f WHERE f.project_id = :pid "
                    f"AND {_folder_type_is('f', 'normal')}",
                    pid=project_id,
                )
            ),
            "user": set(self._ids('SELECT id FROM "user"')),
        }

    def _check_whiteboards(self, project_id: int) -> list[Issue]:
        valid, code_parents = self.whiteboard_references(project_id)
        issues: list[Issue] = []
        for row in self._rows(
            "SELECT id, title, content FROM whiteboard WHERE project_id = :pid ORDER BY id",
            pid=project_id,
        ):
            repaired = repair_whiteboard(row.content, valid, code_parents)
            if repaired is None:
                continue
            _, changes = repaired
            issues.append(
                Issue(
                    key=f"{CheckName.DANGLING_WHITEBOARD_NODE.value}:whiteboard:{row.id}",
                    check=CheckName.DANGLING_WHITEBOARD_NODE,
                    project_id=project_id,
                    message=f"Whiteboard {row.id} ({row.title}) references objects that "
                    f"no longer exist in the project: {'; '.join(changes[:10])}",
                    fix=RepairWhiteboard(whiteboard_id=int(row.id)),
                    hint="Heal applies the changes listed in the message.",
                )
            )
        return issues

    def _check_timeline_analyses(self, project_id: int) -> list[Issue]:
        valid = self.timeline_references(project_id)
        issues: list[Issue] = []
        for row in self._rows(
            "SELECT id, name, concepts FROM timelineanalysis WHERE project_id = :pid "
            "ORDER BY id",
            pid=project_id,
        ):
            repaired = repair_timeline_concepts(row.concepts, valid)
            if repaired is None:
                continue
            _, changes = repaired
            issues.append(
                Issue(
                    key=f"{CheckName.INVALID_TIMELINE_FILTER.value}:timeline:{row.id}",
                    check=CheckName.INVALID_TIMELINE_FILTER,
                    project_id=project_id,
                    message=f"Timeline analysis {row.id} ({row.name}) filters on objects "
                    f"the export cannot resolve: {'; '.join(changes[:10])}",
                    fix=RepairTimelineFilters(timeline_analysis_id=int(row.id)),
                    hint="Heal applies the changes listed in the message; the concepts "
                    "then match more documents or annotations.",
                )
            )
        return issues
