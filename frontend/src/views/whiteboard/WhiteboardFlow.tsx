import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { parseInt } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_useBlocker, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  DefaultEdgeOptions,
  Edge,
  IsValidConnection,
  MarkerType,
  MiniMap,
  NodeMouseHandler,
  NodeTypes,
  OnConnect,
  OnSelectionChangeFunc,
  Panel,
  ReactFlowState,
  XYPosition,
  addEdge,
  updateEdge,
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
import StraightConnectionLine from "./connectionlines/StraightConnectionLine";
import CustomEdge from "./edges/CustomEdge";
import FloatingEdge from "./edges/FloatingEdge";
import { useReactFlowService } from "./hooks/ReactFlowService";
import { useEdgeStateCustom, useNodeStateCustom } from "./hooks/useNodesEdgesStateCustom";
import BboxAnnotationNode from "./nodes/BboxAnnotationNode";
import BorderNode from "./nodes/BorderNode";
import CodeNode from "./nodes/CodeNode";
import MemoNode from "./nodes/MemoNode";
import NoteNode from "./nodes/NoteNode";
import SdocNode from "./nodes/SdocNode";
import SpanAnnotationNode from "./nodes/SpanAnnotationNode";
import TagNode from "./nodes/TagNode";
import TextNode from "./nodes/TextNode";
import AddAnnotationNodeDialog from "./toolbar/AddAnnotationNodeDialog";
import AddBorderNodeButton from "./toolbar/AddBorderNodeButton";
import AddCodeNodeDialog from "./toolbar/AddCodeNodeDialog";
import AddDocumentNodeDialog from "./toolbar/AddDocumentNodeDialog";
import AddMemoNodeDialog from "./toolbar/AddMemoNodeDialog";
import AddNoteNodeButton from "./toolbar/AddNoteNodeButton";
import AddTagNodeDialog from "./toolbar/AddTagNodeDialog";
import AddTextNodeButton from "./toolbar/AddTextNodeButton";
import DatabaseNodeEditMenu, { DatabaseNodeEditMenuHandle } from "./toolbar/DatabaseNodeEditMenu";
import EdgeEditMenu, { EdgeEditMenuHandle } from "./toolbar/EdgeEditMenu";
import TextNodeEditMenu, { TextNodeEditMenuHandle } from "./toolbar/TextNodeEditMenu";
import { isBBoxAnnotationNode, isCodeNode, isSdocNode, isSpanAnnotationNode, isTagNode, isTextNode } from "./types";
import { CustomEdgeData } from "./types/CustomEdgeData";
import { DWTSNodeData } from "./types/DWTSNodeData";
import { PendingAddNodeAction } from "./types/PendingAddNodeAction";
import "./whiteboard.css";
import { defaultDatabaseEdgeOptions, isCodeParentCodeEdge, isDatabaseEdge, isTagSdocEdge } from "./whiteboardUtils";

const nodeTypes: NodeTypes = {
  border: BorderNode,
  note: NoteNode,
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
  custom: CustomEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "custom",
  data: {
    label: {
      text: "",
      variant: "body1",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 255,
      bold: false,
      italic: false,
      underline: false,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
    type: "simplebezier",
  } as CustomEdgeData,
  style: {
    stroke: "#000000",
    strokeWidth: 3,
  },
  markerEnd: {
    color: "#000000",
    type: MarkerType.ArrowClosed,
  },
  markerStart: undefined,
};

const isValidConnection: IsValidConnection = (connection) => {
  // do not allow connection to self
  if (connection.source === connection.target) return false;

  // if source or target handle are database, the other source or target handle has to be database as well
  if (connection.sourceHandle === "database" || connection.targetHandle === "database") {
    return connection.sourceHandle === "database" && connection.targetHandle === "database";
  }
  return true;
};

const resetSelectedElementsSelector = (state: ReactFlowState) => state.resetSelectedElements;
const connectionHandleIdSelector = (state: ReactFlowState) => state.connectionHandleId;

interface WhiteboardFlowProps {
  whiteboard: Whiteboard;
}

function WhiteboardFlow({ whiteboard }: WhiteboardFlowProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);
  const resetSelection = useStore(resetSelectedElementsSelector);
  const connectionHandleId = useStore(connectionHandleIdSelector);

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
  const databaseNodeEditMenuRef = useRef<DatabaseNodeEditMenuHandle>(null);
  const edgeEditMenuRef = useRef<EdgeEditMenuHandle>(null);

  // local state
  const [pendingAction, setPendingAction] = useState<PendingAddNodeAction | undefined>(undefined);
  const [nodes, , onNodesChange] = useNodeStateCustom<DWTSNodeData>(whiteboard.content.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgeStateCustom(whiteboard.content.edges);
  const [currentEdge, setCurrentEdge] = useState<Edge | undefined>(undefined);

  const handleChangePendingAction = useCallback(
    (action: PendingAddNodeAction | undefined) => {
      resetSelection();
      setPendingAction(() => action);
    },
    [resetSelection]
  );

  const handleExecutePendingAction = (event: React.MouseEvent<Element, MouseEvent>) => {
    if (!pendingAction) return;

    // 64 is toolbar sizse
    const whiteboardPosition: XYPosition = reactFlowInstance.project({ x: event.clientX, y: event.clientY - 64 });
    pendingAction(whiteboardPosition, reactFlowService);
    setPendingAction(undefined);
  };

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setPendingAction(undefined);
      if (!connection.source || !connection.target) return;

      if (connection.sourceHandle === "database" && connection.targetHandle === "database") {
        const sourceNode = reactFlowInstance.getNode(connection.source);
        const targetNode = reactFlowInstance.getNode(connection.target);

        if (!sourceNode || !targetNode) return;

        // tag can be manually connected to document
        if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
          const mutation = bulkLinkDocumentTagsMutation.mutate;
          mutation(
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
                  text: "Tag added to document",
                  severity: "success",
                });
              },
            }
          );
        }

        // code can be manually connected to other code
        if (isCodeNode(sourceNode) && isCodeNode(targetNode)) {
          const mutation = updateCodeMutation.mutate;
          mutation(
            {
              codeId: sourceNode.data.codeId,
              requestBody: {
                parent_code_id: targetNode.data.codeId,
              },
            },
            {
              onSuccess() {
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
          const mutation = updateSpanAnnotationMutation.mutate;
          mutation(
            {
              spanId: targetNode.data.spanAnnotationId,
              requestBody: {
                code_id: sourceNode.data.codeId,
              },
            },
            {
              onSuccess() {
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
          const mutation = updateBBoxAnnotationMutation.mutate;
          mutation(
            {
              bboxId: targetNode.data.bboxAnnotationId,
              requestBody: {
                code_id: sourceNode.data.codeId,
              },
            },
            {
              onSuccess() {
                SnackbarAPI.openSnackbar({
                  text: "Updated span annotation",
                  severity: "success",
                });
              },
            }
          );
        }
      } else {
        setEdges((e) => addEdge(connection, e));
      }
    },
    [
      projectId,
      reactFlowInstance,
      setEdges,
      bulkLinkDocumentTagsMutation.mutate,
      updateBBoxAnnotationMutation.mutate,
      updateCodeMutation.mutate,
      updateSpanAnnotationMutation.mutate,
    ]
  );

  // gets called after end of edge gets dragged to another source or target
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    [setEdges]
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
          onSuccess() {
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
          onSuccess(data) {
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

  const onNodeClick: NodeMouseHandler = () => {
    setPendingAction(undefined);
  };

  const onEdgeClick = (event: React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
    setPendingAction(undefined);

    if (!isDatabaseEdge(edge)) {
      return;
    }
    event.preventDefault();
    edgeContextMenuRef.current?.open({
      top: event.clientY,
      left: event.clientX,
    });
  };

  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes, edges }) => {
    if (edges.length === 1) {
      setCurrentEdge(edges[0]);
      if (!isDatabaseEdge(edges[0])) {
        edgeEditMenuRef.current?.open(edges[0].id);
      }
    } else {
      edgeEditMenuRef.current?.close();
      setCurrentEdge(undefined);
    }

    if (nodes.length === 1 && edges.length === 0) {
      if (isTextNode(nodes[0])) {
        textNodeEditMenuRef.current?.open(nodes[0].id);
      } else {
        databaseNodeEditMenuRef.current?.open(nodes[0].id);
      }
    } else {
      textNodeEditMenuRef.current?.close();
      databaseNodeEditMenuRef.current?.close();
    }
  };

  useEffect(() => {
    const elements = document.getElementsByClassName("selected-handle");
    Array.from(elements).forEach((element: Element) => {
      (element as HTMLElement).classList.remove("selected-handle");
    });

    if (currentEdge) {
      let sourceHandle = document.querySelector(`[data-id='${currentEdge.source}-${currentEdge.sourceHandle}-source']`);
      let targetHandle = document.querySelector(`[data-id='${currentEdge.target}-${currentEdge.targetHandle}-source']`);

      sourceHandle?.classList.add("selected-handle");
      targetHandle?.classList.add("selected-handle");
    }
  }, [currentEdge]);

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
  const handleSaveWhiteboard = useCallback(() => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    const mutation = updateWhiteboard.mutate;
    mutation(
      {
        whiteboardId: whiteboard.id,
        requestBody: {
          title: whiteboard.title,
          content: JSON.stringify(newData),
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Saved whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      }
    );
  }, [edges, nodes, updateWhiteboard.mutate, whiteboard.id, whiteboard.title]);

  return (
    <>
      <Box className="myFlexContainer h100">
        <Box className="myFlexFillAllContainer custom-table">
          <ReactFlow
            className="whiteboardflow"
            nodes={nodes}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            edges={edges}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onEdgesChange={onEdgesChange}
            onEdgeClick={onEdgeClick}
            onEdgeContextMenu={onEdgeClick}
            onEdgeUpdate={onEdgeUpdate}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            connectionLineComponent={connectionHandleId === "database" ? StraightConnectionLine : undefined}
            connectionLineStyle={
              connectionHandleId === "database"
                ? defaultDatabaseEdgeOptions.style
                : {
                    strokeWidth: 3,
                    stroke: "black",
                  }
            }
            style={{
              cursor: pendingAction ? "crosshair" : "grab",
            }}
            onPaneClick={handleExecutePendingAction}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={isValidConnection}
            // do not allow edge delete with backspace for database edges
            deleteKeyCode={currentEdge ? (isDatabaseEdge(currentEdge) ? "" : undefined) : undefined}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Panel position="top-left">
              <Paper elevation={1} sx={{ mb: 3 }}>
                <Stack>
                  <Typography p={1}>DWTS Objects</Typography>
                  <AddDocumentNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                  <AddTagNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                  <AddCodeNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                  {userId && (
                    <AddAnnotationNodeDialog
                      projectId={projectId}
                      userIds={[userId]}
                      onClick={handleChangePendingAction}
                    />
                  )}
                  {userId && (
                    <AddMemoNodeDialog projectId={projectId} userId={userId} onClick={handleChangePendingAction} />
                  )}
                </Stack>
              </Paper>
              <Paper elevation={1}>
                <Stack>
                  <Typography p={1}>Text Elements</Typography>
                  <AddNoteNodeButton onClick={handleChangePendingAction} />
                  <AddTextNodeButton onClick={handleChangePendingAction} />
                  <AddBorderNodeButton type="Ellipse" onClick={handleChangePendingAction} />
                  <AddBorderNodeButton type="Rectangle" onClick={handleChangePendingAction} />
                  <AddBorderNodeButton type="Rounded" onClick={handleChangePendingAction} />
                </Stack>
              </Paper>
            </Panel>
            <Panel position="top-center">
              {pendingAction && <Paper sx={{ p: 1 }}>Click anywhere to add node(s)!</Paper>}
              <DatabaseNodeEditMenu ref={databaseNodeEditMenuRef} />
              <TextNodeEditMenu ref={textNodeEditMenuRef} />
              <EdgeEditMenu ref={edgeEditMenuRef} />
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
