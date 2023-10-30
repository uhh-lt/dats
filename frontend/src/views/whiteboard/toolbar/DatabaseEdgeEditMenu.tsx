import { Button, ButtonGroup, Paper, Stack } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { Edge, useReactFlow } from "reactflow";
import CodeHooks from "../../../api/CodeHooks";
import TagHooks from "../../../api/TagHooks";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { isCodeNode, isSdocNode, isTagNode } from "../types";
import { CustomEdgeData } from "../types/CustomEdgeData";
import { isCodeParentCodeEdgeArray, isTagSdocEdgeArray } from "../whiteboardUtils";

interface DatabaseEdgeEditMenuProps {
  projectId: number;
}

export interface DatabaseEdgeEditMenuHandle {
  open: (edges: Edge[]) => void;
  close: () => void;
}

const DatabaseEdgeEditMenu = forwardRef<DatabaseEdgeEditMenuHandle, DatabaseEdgeEditMenuProps>(({ projectId }, ref) => {
  const reactFlowInstance = useReactFlow<any, CustomEdgeData>();

  const [edges, setEdges] = useState<Edge[]>([]);

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (edges: Edge[]) => {
    setEdges(edges);
  };

  const closeMenu = () => {
    setEdges([]);
  };

  // actions
  const bulkUnlinkDocumentTagsMutation = TagHooks.useBulkUnlinkDocumentTags();
  const handleDeleteTagSdocEdges = () => {
    if (edges.length === 0) return;

    edges.forEach((edge) => {
      const sourceNode = reactFlowInstance.getNode(edge.source);
      const targetNode = reactFlowInstance.getNode(edge.target);

      if (!sourceNode || !targetNode) return;

      if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
        bulkUnlinkDocumentTagsMutation.mutate(
          {
            projectId: projectId,
            requestBody: {
              document_tag_ids: [sourceNode.data.tagId],
              source_document_ids: [targetNode.data.sdocId],
            },
          },
          {
            onSuccess() {
              SnackbarAPI.openSnackbar({
                text: "Tag removed from document",
                severity: "success",
              });
            },
          },
        );
      }
    });

    closeMenu();
  };

  const updateCodeMutation = CodeHooks.useUpdateCode();
  const handleDeleteCodeCodeEdges = () => {
    if (edges.length === 0) return;

    edges.forEach((edge) => {
      const sourceNode = reactFlowInstance.getNode(edge.source);
      const targetNode = reactFlowInstance.getNode(edge.target);

      if (!sourceNode || !targetNode) return;

      if (isCodeNode(targetNode) && isCodeNode(sourceNode)) {
        updateCodeMutation.mutate(
          {
            codeId: sourceNode.data.codeId,
            requestBody: {
              // @ts-ignore
              parent_code_id: null,
            },
          },
          {
            onSuccess(data) {
              SnackbarAPI.openSnackbar({
                text: `Removed parent code from code "${data.name}"`,
                severity: "success",
              });
            },
          },
        );
      }
    });

    closeMenu();
  };

  return (
    <>
      {edges.length > 0 && (
        <Paper sx={{ p: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            {isCodeParentCodeEdgeArray(edges) ? (
              <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
                <Button onClick={handleDeleteCodeCodeEdges}>Remove connection to parent code</Button>
              </ButtonGroup>
            ) : isTagSdocEdgeArray(edges) ? (
              <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
                <Button onClick={handleDeleteTagSdocEdges}>Remove tag from document</Button>
              </ButtonGroup>
            ) : (
              <>Database Edges: No common actions available</>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default DatabaseEdgeEditMenu;
