"""Repairs of the JSON columns that reference other rows by id: the content of
whiteboards and the filters of timeline analysis concepts. The export resolves
these ids to names and fails on ids it cannot resolve; the import fails on
names that do not exist in the new project. Both functions are pure, so check
(to find the problems) and heal (to fix them) share them."""

import json
from typing import Any

# whiteboard node type (data.type) -> (entity, id field) (WhiteboardNodeType)
_NODE_REFERENCES: dict[str, tuple[str, str]] = {
    "sdoc": ("sdoc", "sdocId"),
    "code": ("code", "codeId"),
    "tag": ("tag", "tagId"),
    "spanAnnotation": ("span_annotation", "spanAnnotationId"),
    "sentenceAnnotation": ("sentence_annotation", "sentenceAnnotationId"),
    "bboxAnnotation": ("bbox_annotation", "bboxAnnotationId"),
}

# the operators whose values the export resolves from ids to names
# (systems/search_system/filtering_operators.py)
_ID_OPERATORS = {"ID_EQUALS", "ID_NOT_EQUALS"}
_ID_LIST_OPERATORS = {
    "ID_LIST_CONTAINS",
    "ID_LIST_NOT_CONTAINS",
    "IDLR_CONTAINS",
    "IDLR_NOT_CONTAINS",
    "IDLR_CONTAINS_RECURSIVE",
}

# filter column suffix -> entity; the export resolves only these columns, any
# other column with an id operator fails (e.g. SD_SOURCE_DOCUMENT_TYPE)
_COLUMN_ENTITIES = {
    "TAG_ID_LIST_RECURSIVE": "tag",
    "CODE_ID_LIST_RECURSIVE": "code",
    "FOLDER_ID_LIST_RECURSIVE": "folder",
    "USER_ID_LIST": "user",
    "USER_ID": "user",
}


def repair_whiteboard(
    content: str | None,
    valid_ids: dict[str, set[int]],
    code_parents: dict[int, int | None],
) -> tuple[str, list[str]] | None:
    """Removes the nodes whose referenced object is not in `valid_ids` (with
    their edges) and corrects stale parent codes of code nodes. Returns the new
    content and what changed, or None if nothing has to change or the content
    is no JSON object."""
    if content is None:
        return None
    try:
        board = json.loads(content)
    except (TypeError, ValueError):
        return None
    if not isinstance(board, dict):
        return None

    changes: list[str] = []
    kept_nodes: list[Any] = []
    removed_ids: set[str] = set()
    for node in board.get("nodes") or []:
        data = node.get("data") if isinstance(node, dict) else None
        if not isinstance(data, dict):
            kept_nodes.append(node)
            continue
        reference = _NODE_REFERENCES.get(str(data.get("type")))
        if reference is None:
            kept_nodes.append(node)
            continue
        entity, field = reference
        ref_id = data.get(field)
        if not isinstance(ref_id, int) or ref_id not in valid_ids[entity]:
            removed_ids.add(str(node.get("id")))
            changes.append(f"removed {entity} node {ref_id}")
            continue
        if entity == "code" and data.get("parentCodeId") != code_parents.get(ref_id):
            data["parentCodeId"] = code_parents.get(ref_id)
            changes.append(f"updated the parent of code node {ref_id}")
        kept_nodes.append(node)

    if not changes:
        return None
    board["nodes"] = kept_nodes
    board["edges"] = [
        edge
        for edge in board.get("edges") or []
        if not (
            isinstance(edge, dict)
            and (
                str(edge.get("source")) in removed_ids
                or str(edge.get("target")) in removed_ids
            )
        )
    ]
    return json.dumps(board), changes


def _column_entity(column: Any) -> str | None:
    if not isinstance(column, str):
        return None
    for suffix, entity in _COLUMN_ENTITIES.items():
        if column.endswith(suffix):
            return entity
    return None


def _resolvable_id(value: Any) -> int | None:
    """The id the export resolves for a single value: an int, or a str it
    converts with int(); anything else fails."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().lstrip("-").isdigit():
        return int(value)
    return None


def _repair_filter(
    node: dict[str, Any], valid_ids: dict[str, set[int]], changes: list[str]
) -> dict[str, Any] | None:
    """Repairs a filter (with items) or a filter expression; returns None if the
    expression has to be removed."""
    if "items" in node:
        items = []
        for item in node.get("items") or []:
            repaired = (
                _repair_filter(item, valid_ids, changes)
                if isinstance(item, dict)
                else item
            )
            if repaired is not None:
                items.append(repaired)
        node["items"] = items
        return node

    operator = node.get("operator")
    if operator not in _ID_OPERATORS and operator not in _ID_LIST_OPERATORS:
        return node
    column = node.get("column")
    if isinstance(column, int):  # metadata columns are not resolved
        return node
    entity = _column_entity(column)
    if entity is None:
        changes.append(f"removed the unsupported filter on {column}")
        return None

    value = node.get("value")
    if isinstance(value, list):
        # the export accepts only int elements; keep the valid ones as they are
        valid = [v for v in value if _resolvable_id(v) in valid_ids[entity]]
        if all(isinstance(v, int) and not isinstance(v, bool) for v in value) and (
            len(valid) == len(value)
        ):
            return node
        if valid and all(isinstance(v, int) for v in valid):
            node["value"] = valid
            changes.append(
                f"removed the missing {entity}s {[v for v in value if v not in valid]}"
            )
            return node
        changes.append(f"removed the filter on the missing {entity}s {value}")
        return None

    # a single value (the frontend stores single ids, -1 if none was picked)
    if _resolvable_id(value) in valid_ids[entity]:
        return node
    changes.append(f"removed the filter on the missing {entity} {value!r}")
    return None


def repair_timeline_concepts(
    concepts: str | None, valid_ids: dict[str, set[int]]
) -> tuple[str, list[str]] | None:
    """Removes the ids the export cannot resolve from the filters of the
    concepts, and the expressions that are empty afterwards or unsupported.
    Returns the new concepts and what changed, or None if nothing has to change
    or the concepts are no JSON list."""
    if concepts is None:
        return None
    try:
        parsed = json.loads(concepts)
    except (TypeError, ValueError):
        return None
    if not isinstance(parsed, list):
        return None

    changes: list[str] = []
    for concept in parsed:
        specific = (
            concept.get("ta_specific_filter") if isinstance(concept, dict) else None
        )
        root = specific.get("filter") if isinstance(specific, dict) else None
        if isinstance(root, dict):
            _repair_filter(root, valid_ids, changes)
    if not changes:
        return None
    return json.dumps(parsed), changes
