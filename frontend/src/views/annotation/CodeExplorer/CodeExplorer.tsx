import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { AppBar, Button, Divider, Paper, PaperProps, Toolbar } from "@mui/material";
import { useParams } from "react-router-dom";
import CodeTreeView from "./CodeTreeView";
import ICodeTree from "./ICodeTree";
import ProjectHooks from "../../../api/ProjectHooks";
import { codesToTree, flatTreeWithRoot } from "./TreeUtils";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import Tree, { Node } from "ts-tree-structure";
import { AnnoActions } from "../annoSlice";
import CodeEditDialog from "./CodeEditDialog";
import CodeToggleVisibilityButton from "./CodeToggleVisibilityButton";
import CodeEditButton from "./CodeEditButton";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import { useAuth } from "../../../auth/AuthProvider";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import CodeExplorerContextMenu from "./CodeExplorerContextMenu";
import { AttachedObjectType } from "../../../api/openapi";
import SpanCreationDialog, { CodeCreationDialogHandle } from "../SpanContextMenu/SpanCreationDialog";
import AddBoxIcon from "@mui/icons-material/AddBox";

interface CodeExplorerProps {
  showToolbar?: boolean;
}

function CodeExplorer({ showToolbar, ...props }: CodeExplorerProps & PaperProps) {
  const { user } = useAuth();
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state
  // TODO: this is not the correct query, we are actually not interested in all codes!
  const allCodes = ProjectHooks.useGetAllCodes(projId);

  // global client state (redux)
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const dispatch = useAppDispatch();

  // local state
  const codeCreationDialogRef = useRef<CodeCreationDialogHandle>(null);

  // computed
  const codeTree: Node<ICodeTree> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<ICodeTree>(codesToTree(allCodes.data));
    } else {
      return null;
    }
  }, [allCodes.data]);

  // effects
  // update global client state when selection changes
  // we tell the annotator which codes are available for selection in the combobox
  useEffect(() => {
    if (selectedCodeId && codeTree) {
      let parentCode = codeTree.first((node) => node.model.code.id === selectedCodeId);
      dispatch(AnnoActions.setCodesForSelection(flatTreeWithRoot(parentCode!.model)));
    } else {
      dispatch(AnnoActions.setCodesForSelection(allCodes.data || []));
    }
  }, [dispatch, selectedCodeId, allCodes.data, codeTree]);

  // handle ui events
  const handleSelectCode = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const id = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
    dispatch(AnnoActions.setSelectedParentCodeId(selectedCodeId === id ? undefined : id));
  };
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    dispatch(AnnoActions.setExpandedParentCodeIds([nodeId, ...expandedCodeIds]));
    // dispatch(AnnotationActions.setSelectedParentCodeId(parseInt(nodeId)));
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    dispatch(AnnoActions.setExpandedParentCodeIds(newCodeIds));
    // dispatch(AnnotationActions.setSelectedParentCodeId(parseInt(nodeId)));
  };

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<ICodeTree>();
  const onContextMenu = (node: ICodeTree) => (event: any) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(node);
  };

  const content = (
    <>
      {user.isSuccess && allCodes.isSuccess && codeTree ? (
        <>
          <Button
            variant="contained"
            onClick={() => codeCreationDialogRef.current!.open()}
            startIcon={<AddBoxIcon />}
            sx={{ my: 0.5, mx: 2 }}
          >
            Add Code
          </Button>
          <Divider />
          <CodeTreeView
            className="myFlexFillAllContainer"
            data={codeTree.model}
            multiSelect={false}
            selected={selectedCodeId?.toString() || ""}
            expanded={expandedCodeIds}
            onNodeSelect={handleSelectCode}
            onExpandClick={handleExpandClick}
            onCollapseClick={handleCollapseClick}
            renderActions={(node) => (
              <React.Fragment>
                <CodeToggleVisibilityButton code={node} />
                <CodeEditButton code={node.code} />
                <MemoButton attachedObjectId={node.code.id} attachedObjectType={AttachedObjectType.CODE} />
              </React.Fragment>
            )}
            openContextMenu={onContextMenu}
          />
          <CodeEditDialog codes={allCodes.data} />
          <SpanCreationDialog ref={codeCreationDialogRef} />
          <CodeExplorerContextMenu
            node={contextMenuData}
            position={contextMenuPosition}
            handleClose={() => setContextMenuPosition(null)}
          />
        </>
      ) : user.isError ? (
        <>{user.error.message}</>
      ) : allCodes.isError ? (
        <>{allCodes.error.message}</>
      ) : (
        "Loading..."
      )}
    </>
  );

  return (
    <>
      {showToolbar ? (
        <Paper square className="myFlexContainer" {...props} elevation={1}>
          <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
            <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
              <Typography variant="h6" color="inherit" component="div">
                Code Explorer
              </Typography>
            </Toolbar>
          </AppBar>
          {content}
        </Paper>
      ) : (
        <>{content}</>
      )}
    </>
  );
}

export default CodeExplorer;
