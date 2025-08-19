from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from modules.eximport.whiteboards.whiteboard_export_schema import (
    BBoxAnnotationNodeDataForExport,
    CodeNodeDataForExport,
    MemoNodeDataForExport,
    SdocNodeDataForExport,
    SentenceAnnotationNodeDataForExport,
    SpanAnnotationNodeDataForExport,
    TagNodeDataForExport,
    WhiteboardContentForExport,
    WhiteboardNodeForExport,
)
from modules.whiteboard.whiteboard_dto import (
    BBoxAnnotationNodeData,
    CodeNodeData,
    MemoNodeData,
    SdocNodeData,
    SentenceAnnotationNodeData,
    SpanAnnotationNodeData,
    TagNodeData,
    WhiteboardContent,
    WhiteboardNode,
    WhiteboardNodeType,
)


def transform_content_for_export(
    db: Session, content: WhiteboardContent
) -> WhiteboardContentForExport:
    """
    Transform whiteboard content for export.

    This function transforms a whiteboard content to prepare it for export.

    Args:
        db: Database session
        content: WhiteboardContent

    Returns:
        Transformed WhiteboardContentForExport
    """
    # Parse the content string to a WhiteboardContent object
    # wb_content = WhiteboardContent.model_validate_json(content)

    # 1. Group nodes by type
    node_type_groups: dict[WhiteboardNodeType, list[WhiteboardNode]] = {}
    for node in content.nodes:
        node_type = node.data.type
        if node_type not in node_type_groups:
            node_type_groups[node_type] = []
        node_type_groups[node_type].append(node)

    # 2. Transform nodes to the appropriate export format
    transformed_nodes: list[WhiteboardNodeForExport] = []
    for node_type, nodes in node_type_groups.items():
        transformed_nodes.extend(
            transform_nodes_for_export(db=db, node_type=node_type, nodes=nodes)
        )

    # 3. Create the transformed content
    return WhiteboardContentForExport(
        nodes=transformed_nodes,
        edges=content.edges,
    )

    # Here you could implement transformations for the content
    # For example, resolving IDs in nodes to their names for better portability

    # Currently we're just validating the content structure
    # Future improvements might include transforming node/edge data for better portability

    # Return the validated content as a JSON string
    # return json.dumps(wb_content.model_dump())


def transform_nodes_for_export(
    db: Session, node_type: WhiteboardNodeType, nodes: list[WhiteboardNode]
) -> list[WhiteboardNodeForExport]:
    """
    Transform nodes of a specific type for export.

    This function transforms whiteboard nodes of a specific type for export:
    - Basic nodes (TEXT, NOTE, BORDER) are exported as-is
    - SDOC nodes: resolve sdocId to sdoc_filename
    - CODE nodes: resolve codeId to code_name
    - TAG nodes: resolve tagId to tag_name
    - ANNOTATION nodes: resolve IDs to UUIDs
    - MEMO nodes: currently just passed through

    Args:
        db: Database session for resolving IDs
        node_type: The type of nodes to transform
        nodes: The list of nodes to transform

    Returns:
        List of transformed nodes ready for export
    """
    transformed_nodes: list[WhiteboardNodeForExport] = []
    match node_type:
        case (
            WhiteboardNodeType.TEXT
            | WhiteboardNodeType.NOTE
            | WhiteboardNodeType.BORDER
        ):
            # Basic nodes are exported as-is
            transformed_nodes.extend(
                [WhiteboardNodeForExport(**node.model_dump()) for node in nodes]
            )

        case WhiteboardNodeType.SDOC:
            # Resolve sdocId to sdoc_filename
            sdoc_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, SdocNodeData), "Expected SdocNodeData type"
                sdoc_ids.append(node.data.sdocId)

            sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
            sdoc_id_to_name: dict[int, str] = {sdoc.id: sdoc.filename for sdoc in sdocs}

            for node in nodes:
                assert isinstance(node.data, SdocNodeData), "Expected SdocNodeData type"
                sdoc_name = sdoc_id_to_name.get(
                    node.data.sdocId, f"unknown-sdoc-{node.data.sdocId}"
                )
                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SdocNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"sdocId"},
                            ),
                            sdoc_filename=sdoc_name,
                        ),
                    )
                )

        case WhiteboardNodeType.CODE:
            # Resolve codeId to code_name
            code_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, CodeNodeData), "Expected CodeNodeData type"
                code_ids.append(node.data.codeId)
                if node.data.parentCodeId is not None:
                    code_ids.append(node.data.parentCodeId)

            codes = crud_code.read_by_ids(db=db, ids=code_ids)
            code_id_to_name: dict[int, str] = {code.id: code.name for code in codes}

            for node in nodes:
                assert isinstance(node.data, CodeNodeData), "Expected CodeNodeData type"
                code_name = code_id_to_name.get(
                    node.data.codeId, f"unknown-code-{node.data.codeId}"
                )
                parent_code_name = None
                if node.data.parentCodeId is not None:
                    parent_code_name = code_id_to_name.get(
                        node.data.parentCodeId, f"unknown-code-{node.data.parentCodeId}"
                    )

                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=CodeNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"codeId", "parentCodeId"},
                            ),
                            code_name=code_name,
                            parent_code_name=parent_code_name,
                        ),
                    )
                )

        case WhiteboardNodeType.TAG:
            # Resolve tagId to tag_name
            tag_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, TagNodeData), "Expected TagNodeData type"
                tag_ids.append(node.data.tagId)

            tags = crud_tag.read_by_ids(db=db, ids=tag_ids)
            tag_id_to_name: dict[int, str] = {tag.id: tag.name for tag in tags}

            for node in nodes:
                assert isinstance(node.data, TagNodeData), "Expected TagNodeData type"
                tag_name = tag_id_to_name.get(
                    node.data.tagId, f"unknown-tag-{node.data.tagId}"
                )

                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=TagNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"tagId"},
                            ),
                            tag_name=tag_name,
                        ),
                    )
                )

        case WhiteboardNodeType.SPAN_ANNOTATION:
            # Resolve spanAnnotationId to UUID
            span_annotation_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, SpanAnnotationNodeData), (
                    "Expected SpanAnnotationNodeData type"
                )
                span_annotation_ids.append(node.data.spanAnnotationId)

            span_annotations = crud_span_anno.read_by_ids(
                db=db, ids=span_annotation_ids
            )
            span_annotation_id_to_uuid: dict[int, str] = {
                sa.id: sa.uuid for sa in span_annotations
            }

            for node in nodes:
                assert isinstance(node.data, SpanAnnotationNodeData), (
                    "Expected SpanAnnotationNodeData type"
                )
                span_annotation_uuid = span_annotation_id_to_uuid.get(
                    node.data.spanAnnotationId,
                    f"unknown-span-annotation-{node.data.spanAnnotationId}",
                )

                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SpanAnnotationNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"spanAnnotationId"},
                            ),
                            span_annotation_uuid=span_annotation_uuid,
                        ),
                    )
                )

        case WhiteboardNodeType.SENTENCE_ANNOTATION:
            # Resolve sentenceAnnotationId to UUID
            sentence_annotation_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, SentenceAnnotationNodeData), (
                    "Expected SentenceAnnotationNodeData type"
                )
                sentence_annotation_ids.append(node.data.sentenceAnnotationId)

            sentence_annotations = crud_sentence_anno.read_by_ids(
                db=db, ids=sentence_annotation_ids
            )
            sentence_annotation_id_to_uuid: dict[int, str] = {
                sa.id: sa.uuid for sa in sentence_annotations
            }

            for node in nodes:
                assert isinstance(node.data, SentenceAnnotationNodeData), (
                    "Expected SentenceAnnotationNodeData type"
                )
                sentence_annotation_uuid = sentence_annotation_id_to_uuid.get(
                    node.data.sentenceAnnotationId,
                    f"unknown-sentence-annotation-{node.data.sentenceAnnotationId}",
                )

                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SentenceAnnotationNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"sentenceAnnotationId"},
                            ),
                            sentence_annotation_uuid=sentence_annotation_uuid,
                        ),
                    )
                )

        case WhiteboardNodeType.BBOX_ANNOTATION:
            # Resolve bboxAnnotationId to UUID
            bbox_annotation_ids: list[int] = []
            for node in nodes:
                assert isinstance(node.data, BBoxAnnotationNodeData), (
                    "Expected BBoxAnnotationNodeData type"
                )
                bbox_annotation_ids.append(node.data.bboxAnnotationId)

            bbox_annotations = crud_bbox_anno.read_by_ids(
                db=db, ids=bbox_annotation_ids
            )
            bbox_annotation_id_to_uuid: dict[int, str] = {
                ba.id: ba.uuid for ba in bbox_annotations
            }

            for node in nodes:
                assert isinstance(node.data, BBoxAnnotationNodeData), (
                    "Expected BBoxAnnotationNodeData type"
                )
                bbox_annotation_uuid = bbox_annotation_id_to_uuid.get(
                    node.data.bboxAnnotationId,
                    f"unknown-bbox-annotation-{node.data.bboxAnnotationId}",
                )

                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=BBoxAnnotationNodeDataForExport(
                            **node.data.model_dump(
                                exclude={"bboxAnnotationId"},
                            ),
                            bbox_annotation_uuid=bbox_annotation_uuid,
                        ),
                    )
                )

        case WhiteboardNodeType.MEMO:
            # For now, we'll just pass through memo nodes without transformation
            # As per the requirements, we'll skip real transformation for memos
            for node in nodes:
                assert isinstance(node.data, MemoNodeData), "Expected MemoNodeData type"
                transformed_nodes.append(
                    WhiteboardNodeForExport(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=MemoNodeDataForExport(
                            **node.data.model_dump(),
                        ),
                    )
                )

    return transformed_nodes


def transform_content_for_import(
    db: Session, project_id: int, content: WhiteboardContentForExport
) -> tuple[WhiteboardContent, list[str]]:
    """
    Transform whiteboard content for import.

    This function transforms a whiteboard content for import into a project.
    It resolves names and UUIDs to IDs for the current project.

    Args:
        db: Database session
        project_id: ID of the project to import the whiteboard into
        content: JSON string representation of WhiteboardContentForExport

    Returns:
        Tuple of (transformed content as JSON string, list of error messages)
    """
    # Group nodes by type
    node_type_groups: dict[WhiteboardNodeType, list[WhiteboardNodeForExport]] = {}
    for node in content.nodes:
        node_type = node.data.type
        if node_type not in node_type_groups:
            node_type_groups[node_type] = []
        node_type_groups[node_type].append(node)

    # Transform nodes for import
    all_errors: list[str] = []
    transformed_nodes: list[WhiteboardNode] = []

    for node_type, nodes in node_type_groups.items():
        nodes_result, errors = transform_nodes_for_import(
            db=db, project_id=project_id, node_type=node_type, nodes=nodes
        )
        transformed_nodes.extend(nodes_result)
        all_errors.extend(errors)

    # Create the transformed content
    transformed_content = WhiteboardContent(
        nodes=transformed_nodes,
        edges=content.edges,
    )

    # Return the transformed content as a JSON string
    return transformed_content, all_errors


def transform_nodes_for_import(
    db: Session,
    project_id: int,
    node_type: WhiteboardNodeType,
    nodes: list[WhiteboardNodeForExport],
) -> tuple[list[WhiteboardNode], list[str]]:
    """
    Transform nodes of a specific type for import.

    This function transforms whiteboard nodes of a specific type for import:
    - Basic nodes (TEXT, NOTE, BORDER) are imported as-is
    - SDOC nodes: resolve sdoc_filename to sdocId
    - CODE nodes: resolve code_name to codeId
    - TAG nodes: resolve tag_name to tagId
    - ANNOTATION nodes: resolve UUIDs to IDs
    - MEMO nodes: currently just passed through

    Args:
        db: Database session for resolving names/UUIDs to IDs
        project_id: ID of the project for resolving references
        node_type: The type of nodes to transform
        nodes: The list of nodes to transform

    Returns:
        Tuple of (list of transformed nodes ready for import, list of error messages)
    """
    transformed_nodes: list[WhiteboardNode] = []
    errors: list[str] = []

    match node_type:
        case (
            WhiteboardNodeType.TEXT
            | WhiteboardNodeType.NOTE
            | WhiteboardNodeType.BORDER
        ):
            # Basic nodes are imported as-is
            for node in nodes:
                transformed_nodes.append(WhiteboardNode(**node.model_dump()))

        case WhiteboardNodeType.SDOC:
            # Resolve sdoc_filename to sdocId
            for node in nodes:
                assert isinstance(node.data, SdocNodeDataForExport), (
                    "Expected SdocNodeDataForExport type"
                )
                sdoc = crud_sdoc.read_by_filename(
                    db=db,
                    proj_id=project_id,
                    filename=node.data.sdoc_filename,
                    only_finished=False,
                )
                if sdoc is None:
                    errors.append(
                        f"Source document with filename '{node.data.sdoc_filename}' not found in project {project_id}"
                    )
                    continue
                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SdocNodeData(
                            **node.data.model_dump(
                                exclude={"sdoc_filename"},
                            ),
                            sdocId=sdoc.id,
                        ),
                    )
                )

        case WhiteboardNodeType.CODE:
            # Resolve code_name to codeId
            project_codes = crud_project.read(db=db, id=project_id).codes
            code_name_to_id: dict[str, int] = {
                code.name: code.id for code in project_codes
            }

            for node in nodes:
                assert isinstance(node.data, CodeNodeDataForExport), (
                    "Expected CodeNodeDataForExport type"
                )
                code_id = code_name_to_id.get(node.data.code_name)
                if code_id is None:
                    errors.append(
                        f"Code with name '{node.data.code_name}' not found in project {project_id}"
                    )
                    continue
                parent_code_id = None
                if node.data.parent_code_name:
                    parent_code_id = code_name_to_id.get(node.data.parent_code_name)
                    if parent_code_id is None:
                        errors.append(
                            f"Parent code with name '{node.data.parent_code_name}' not found in project {project_id}"
                        )
                        continue

                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=CodeNodeData(
                            **node.data.model_dump(
                                exclude={"code_name", "parent_code_name"},
                            ),
                            codeId=code_id,
                            parentCodeId=parent_code_id,
                        ),
                    )
                )

        case WhiteboardNodeType.TAG:
            # Resolve tag_name to tagId
            project_tags = crud_project.read(db=db, id=project_id).tags
            tag_name_to_id: dict[str, int] = {tag.name: tag.id for tag in project_tags}
            # Check if all tags exist in the project
            for node in nodes:
                assert isinstance(node.data, TagNodeDataForExport), (
                    "Expected TagNodeDataForExport type"
                )
                tag_id = tag_name_to_id.get(node.data.tag_name)
                if tag_id is None:
                    errors.append(
                        f"Tag with name '{node.data.tag_name}' not found in project {project_id}"
                    )
                    continue
                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=TagNodeData(
                            **node.data.model_dump(
                                exclude={"tag_name"},
                            ),
                            tagId=tag_id,
                        ),
                    )
                )

        case WhiteboardNodeType.SPAN_ANNOTATION:
            # Resolve span_annotation_uuid to spanAnnotationId
            for node in nodes:
                assert isinstance(node.data, SpanAnnotationNodeDataForExport), (
                    "Expected SpanAnnotationNodeDataForExport type"
                )
                span_annotation = crud_span_anno.read_by_project_and_uuid(
                    db=db, project_id=project_id, uuid=node.data.span_annotation_uuid
                )
                if span_annotation is None:
                    errors.append(
                        f"Span annotation with UUID '{node.data.span_annotation_uuid}' not found in project {project_id}"
                    )
                    continue
                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SpanAnnotationNodeData(
                            **node.data.model_dump(
                                exclude={"span_annotation_uuid"},
                            ),
                            spanAnnotationId=span_annotation.id,
                        ),
                    )
                )

        case WhiteboardNodeType.SENTENCE_ANNOTATION:
            # Resolve sentence_annotation_uuid to sentenceAnnotationId
            for node in nodes:
                assert isinstance(node.data, SentenceAnnotationNodeDataForExport), (
                    "Expected SentenceAnnotationNodeDataForExport type"
                )
                sentence_annotation = crud_sentence_anno.read_by_project_and_uuid(
                    db=db,
                    project_id=project_id,
                    uuid=node.data.sentence_annotation_uuid,
                )
                if sentence_annotation is None:
                    errors.append(
                        f"Sentence annotation with UUID '{node.data.sentence_annotation_uuid}' not found in project {project_id}"
                    )
                    continue
                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=SentenceAnnotationNodeData(
                            **node.data.model_dump(
                                exclude={"sentence_annotation_uuid"},
                            ),
                            sentenceAnnotationId=sentence_annotation.id,
                        ),
                    )
                )

        case WhiteboardNodeType.BBOX_ANNOTATION:
            # Resolve bbox_annotation_uuid to bboxAnnotationId
            for node in nodes:
                assert isinstance(node.data, BBoxAnnotationNodeDataForExport), (
                    "Expected BBoxAnnotationNodeDataForExport type"
                )
                bbox_annotation = crud_bbox_anno.read_by_project_and_uuid(
                    db=db,
                    project_id=project_id,
                    uuid=node.data.bbox_annotation_uuid,
                )
                if bbox_annotation is None:
                    errors.append(
                        f"BBox annotation with UUID '{node.data.bbox_annotation_uuid}' not found in project {project_id}"
                    )
                    continue
                transformed_nodes.append(
                    WhiteboardNode(
                        **node.model_dump(
                            exclude={"data"},
                        ),
                        data=BBoxAnnotationNodeData(
                            **node.data.model_dump(
                                exclude={"bbox_annotation_uuid"},
                            ),
                            bboxAnnotationId=bbox_annotation.id,
                        ),
                    )
                )

        case WhiteboardNodeType.MEMO:
            # For now, we'll just pass through memo nodes without transformation
            # As per the requirements, we'll skip real transformation for memos
            for node in nodes:
                transformed_nodes.append(WhiteboardNode(**node.model_dump()))

    return transformed_nodes, errors
