import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { parseInt } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_useBlocker, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  DefaultEdgeOptions,
  Edge,
  MarkerType,
  MiniMap,
  NodeTypes,
  OnConnect,
  OnSelectionChangeFunc,
  Panel,
  ReactFlowState,
  useReactFlow,
  useStore,
} from "reactflow";
import "reactflow/dist/style.css";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";
import CodeHooks from "../../api/CodeHooks";
import ProjectHooks from "../../api/ProjectHooks";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import TagHooks from "../../api/TagHooks";
import WhiteboardHooks, { Whiteboard, WhiteboardGraph } from "../../api/WhiteboardHooks";
import { useAuth } from "../../auth/AuthProvider";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../components/GenericPositionMenu";
import BBoxAnnotationEditDialog from "../../features/CrudDialog/BBoxAnnotation/BBoxAnnotationEditDialog";
import CodeCreateDialog from "../../features/CrudDialog/Code/CodeCreateDialog";
import CodeEditDialog from "../../features/CrudDialog/Code/CodeEditDialog";
import SpanAnnotationEditDialog from "../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import TagEditDialog from "../../features/CrudDialog/Tag/TagEditDialog";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import CustomConnectionLine from "./connectionlines/CustomConnectionLine";
import FloatingEdge from "./edges/FloatingEdge";
import { useEdgeStateCustom, useNodeStateCustom } from "./hooks/useNodesEdgesStateCustom";
import BboxAnnotationNode from "./nodes/BboxAnnotationNode";
import CodeNode from "./nodes/CodeNode";
import MemoNode from "./nodes/MemoNode";
import SdocNode from "./nodes/SdocNode";
import SpanAnnotationNode from "./nodes/SpanAnnotationNode";
import TagNode from "./nodes/TagNode";
import TextNode from "./nodes/TextNode";
import AddAnnotationNodeDialog from "./toolbar/AddAnnotationNodeDialog";
import AddCodeNodeDialog from "./toolbar/AddCodeNodeDialog";
import AddDocumentNodeDialog from "./toolbar/AddDocumentNodeDialog";
import AddMemoNodeDialog from "./toolbar/AddMemoNodeDialog";
import AddTagNodeDialog from "./toolbar/AddTagNodeDialog";
import AddTextNodeButton from "./toolbar/AddTextNodeButton";
import TextNodeEditMenu, { TextNodeEditMenuHandle } from "./toolbar/TextNodeEditMenu";
import { isBBoxAnnotationNode, isCodeNode, isSdocNode, isSpanAnnotationNode, isTagNode, isTextNode } from "./types";
import { DWTSNodeData } from "./types/DWTSNodeData";
import { isCodeParentCodeEdge, isConnectionAllowed, isTagSdocEdge } from "./whiteboardUtils";

const nodeTypes: NodeTypes = {
  text: TextNode,
  memo: MemoNode,
  sdoc: SdocNode,
  tag: TagNode,
  code: CodeNode,
  spanAnnotation: SpanAnnotationNode,
  bboxAnnotation: BboxAnnotationNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { strokeWidth: 3, stroke: "black" },
  type: "floating",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "black",
  },
};

const resetSelectedElementsSelector = (state: ReactFlowState) => state.resetSelectedElements;

interface WhiteboardFlowProps {
  whiteboard: Whiteboard;
}

function WhiteboardFlow({ whiteboard }: WhiteboardFlowProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData>();
  const resetSelection = useStore(resetSelectedElementsSelector);

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const userId = useAuth().user.data?.id;

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);

  // mutations
  const bulkLinkDocumentTagsMutation = TagHooks.useBulkLinkDocumentTags();
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const updateSpanAnnotationMutation = SpanAnnotationHooks.useUpdate();
  const updateBBoxAnnotationMutation = BboxAnnotationHooks.useUpdate();
  const bulkUnlinkDocumentTagsMutation = TagHooks.useBulkUnlinkDocumentTags();

  // menu refs
  const edgeContextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const textNodeEditMenuRef = useRef<TextNodeEditMenuHandle>(null);

  // local state
  const [nodes, setNodes, onNodesChange] = useNodeStateCustom<DWTSNodeData>(whiteboard.content.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgeStateCustom(whiteboard.content.edges);
  const [currentEdge, setCurrentEdge] = useState<Edge | undefined>(undefined);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;
      if (!isConnectionAllowed(connection.source, connection.target)) return;

      const sourceNode = reactFlowInstance.getNode(connection.source);
      const targetNode = reactFlowInstance.getNode(connection.target);

      if (!sourceNode || !targetNode) return;

      // tag can be manually connected to document
      if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
        bulkLinkDocumentTagsMutation.mutate(
          {
            projectId: projectId,
            requestBody: {
              document_tag_ids: [sourceNode.data.tagId],
              source_document_ids: [targetNode.data.sdocId],
            },
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: "Tag added to document",
                severity: "success",
              });
            },
          }
        );
      }

      // code can be manually connected to other code
      if (isCodeNode(sourceNode) && isCodeNode(targetNode)) {
        updateCodeMutation.mutate(
          {
            codeId: sourceNode.data.codeId,
            requestBody: {
              parent_code_id: targetNode.data.codeId,
            },
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: "Updated parent code",
                severity: "success",
              });
            },
          }
        );
      }

      // codes can be manually connected to annotations
      if (isCodeNode(sourceNode) && isSpanAnnotationNode(targetNode)) {
        updateSpanAnnotationMutation.mutate(
          {
            spanId: targetNode.data.spanAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: "Updated span annotation",
                severity: "success",
              });
            },
          }
        );
      }

      // codes can be manually connected to annotations
      if (isCodeNode(sourceNode) && isBBoxAnnotationNode(targetNode)) {
        updateBBoxAnnotationMutation.mutate(
          {
            bboxId: targetNode.data.bboxAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: "Updated span annotation",
                severity: "success",
              });
            },
          }
        );
      }
    },
    [
      bulkLinkDocumentTagsMutation,
      projectId,
      reactFlowInstance,
      updateBBoxAnnotationMutation,
      updateCodeMutation,
      updateSpanAnnotationMutation,
    ]
  );

  const handleDeleteTagSdocEdge = () => {
    if (!currentEdge) return;

    const sourceNode = reactFlowInstance.getNode(currentEdge.source);
    const targetNode = reactFlowInstance.getNode(currentEdge.target);

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
          onSuccess(data, variables, context) {
            SnackbarAPI.openSnackbar({
              text: "Tag removed from document",
              severity: "success",
            });
          },
        }
      );
    }

    edgeContextMenuRef.current?.close();
    setCurrentEdge(undefined);
  };

  const handleDeleteCodeCodeEdge = () => {
    if (!currentEdge) return;

    const sourceNode = reactFlowInstance.getNode(currentEdge.source);
    const targetNode = reactFlowInstance.getNode(currentEdge.target);

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
          onSuccess(data, variables, context) {
            SnackbarAPI.openSnackbar({
              text: `Removed parent code from code "${data.name}"`,
              severity: "success",
            });
          },
        }
      );
    }

    edgeContextMenuRef.current?.close();
    setCurrentEdge(undefined);
  };

  const onEdgeClick = (event: React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
    event.preventDefault();
    edgeContextMenuRef.current?.open({
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes, edges }) => {
    if (edges.length === 1) {
      setCurrentEdge(edges[0]);
    } else {
      setCurrentEdge(undefined);
    }

    if (nodes.length === 1 && edges.length === 0 && isTextNode(nodes[0])) {
      textNodeEditMenuRef.current?.open(nodes[0].id);
    } else {
      textNodeEditMenuRef.current?.close();
    }
  };

  // SAVE Feature
  // block navigation if we have changes
  const [oldData, setOldData] = useState(JSON.stringify(whiteboard.content));
  useEffect(() => {
    setOldData(JSON.stringify(whiteboard.content));
  }, [whiteboard.content]);
  unstable_useBlocker(() => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    if (oldData !== JSON.stringify(newData)) {
      return !window.confirm("You have unsaved changes! Are you sure you want to leave?");
    }
    return false;
  });

  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();
  const handleSaveWhiteboard = () => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    updateWhiteboard.mutate(
      {
        whiteboardId: whiteboard.id,
        requestBody: {
          title: whiteboard.title,
          content: JSON.stringify(newData),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Saved whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      }
    );
  };

  return (
    <>
      <Box className="myFlexContainer h100">
        <Box className="myFlexFillAllContainer custom-table">
          <ReactFlow
            nodes={nodes}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            edges={edges}
            onEdgesChange={onEdgesChange}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onEdgeClick={onEdgeClick}
            onEdgeContextMenu={onEdgeClick}
            // onPaneClick={clearSelection}
            // onNodeClick={selectNode}
            // onNodeDragStart={selectNode}
            // onConnectStart={handleNodeExpand}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            connectionLineComponent={CustomConnectionLine}
            connectionLineStyle={{
              strokeWidth: 3,
              stroke: "black",
            }}
            // do not allow edge delete with backspace
            deleteKeyCode={currentEdge ? "" : undefined}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Panel position="top-left">
              <Paper elevation={1} sx={{ mb: 3 }}>
                <Stack>
                  <Typography p={1}>DWTS Objects</Typography>
                  <AddDocumentNodeDialog projectId={projectId} />
                  <AddTagNodeDialog projectId={projectId} />
                  <AddCodeNodeDialog projectId={projectId} />
                  {userId && <AddAnnotationNodeDialog projectId={projectId} userIds={[userId]} />}
                  {userId && <AddMemoNodeDialog projectId={projectId} userId={userId} />}
                </Stack>
              </Paper>
              <Paper elevation={1}>
                <Stack>
                  <Typography p={1}>Text Elements</Typography>
                  <AddTextNodeButton />
                  <Button>Add text</Button>
                  <Button>Add shape</Button>
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-center">
              <TextNodeEditMenu ref={textNodeEditMenuRef} />
            </Panel>
            <Panel position="top-right">
              <Paper elevation={1}>
                <LoadingButton
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  fullWidth
                  type="submit"
                  loading={updateWhiteboard.isLoading}
                  loadingPosition="start"
                  onClick={handleSaveWhiteboard}
                >
                  Save whiteboard
                </LoadingButton>
              </Paper>
            </Panel>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>
      </Box>
      <GenericPositionMenu ref={edgeContextMenuRef} onClose={() => resetSelection()}>
        {!currentEdge ? (
          <MenuItem disabled={true}>No action available</MenuItem>
        ) : isCodeParentCodeEdge(currentEdge) ? (
          <MenuItem onClick={handleDeleteCodeCodeEdge}>Remove connection to parent code</MenuItem>
        ) : isTagSdocEdge(currentEdge) ? (
          <MenuItem onClick={handleDeleteTagSdocEdge}>Remove tag from document</MenuItem>
        ) : (
          <MenuItem disabled={true}>No action available</MenuItem>
        )}
      </GenericPositionMenu>
      <TagEditDialog />
      <SpanAnnotationEditDialog projectId={projectId} />
      <BBoxAnnotationEditDialog projectId={projectId} />
      <CodeCreateDialog />
      {projectCodes.isSuccess && <CodeEditDialog codes={projectCodes.data} />}
    </>
  );
}

export default WhiteboardFlow;
