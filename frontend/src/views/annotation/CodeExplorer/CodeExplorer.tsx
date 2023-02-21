import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { AppBar, Button, Checkbox, Divider, Paper, PaperProps, Toolbar } from "@mui/material";
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
import MemoButton from "../../../features/Memo/MemoButton";
import { useAuth } from "../../../auth/AuthProvider";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import CodeExplorerContextMenu from "./CodeExplorerContextMenu";
import { AttachedObjectType } from "../../../api/openapi";
import SpanCreationDialog, { CodeCreationDialogHandle } from "../SpanContextMenu/SpanCreationDialog";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { LogbookActions } from "../../logbook/logbookSlice";
import { CodeGraphActions } from "../../analysis/CodeGraph/codeGraphSlice";
import { CheckBoxActions } from "../../analysis/CodeGraph/CheckBoxSlice";
import { StaticDatePicker } from "@mui/lab";

interface CodeExplorerProps {
  showToolbar?: boolean;
  showCheckboxes?: boolean;
}

function CodeExplorer({ showToolbar, showCheckboxes, ...props }: CodeExplorerProps & PaperProps) {
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

  // checlboxes=

  const checkBoxes = useAppSelector((state) => state.checkBoxs.checkBoxes);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, node: any) => {
    const { checked } = event.target;
    let newCheckBoxes = checkBoxes.slice();
    const index = newCheckBoxes.findIndex((item) => item.code.id === node.code.id);

    if (checked) {
      const nodesToAdd = getNodesToAdd(node);
      const nodesToAddIds = nodesToAdd.map((n) => n.code.id);
      newCheckBoxes = newCheckBoxes.filter((item) => !nodesToAddIds.includes(item.code.id));
      newCheckBoxes.push(...nodesToAdd);
    } else {
      const nodesToRemove = getNodesToRemove(node);
      const nodesToRemoveIds = nodesToRemove.map((n) => n.code.id);
      newCheckBoxes = newCheckBoxes.filter((item) => !nodesToRemoveIds.includes(item.code.id));
    }

    dispatch(CheckBoxActions.toggleCheckBox(newCheckBoxes));
  };

  const getNodesToAdd = (node: any) => {
    const nodes: any[] = [node];

    if (node.children) {
      node.children.forEach((child: any) => {
        if (!isChecked(child)) {
          nodes.push(...getNodesToAdd(child));
        }
      });
    }

    return nodes;
  };

  const getNodesToRemove = (node: any) => {
    const nodes: any[] = [];

    if (node.children) {
      node.children.forEach((child: any) => {
        if (isChecked(child)) {
          nodes.push(...getNodesToRemove(child));
        }
      });
    }

    nodes.push(node);
    return nodes;
  };

  const isChecked = (node: any) => {
    const rootNode = checkBoxes.find((item) => item.code.id === node.code.id);
    if (!rootNode) {
      return false;
    }
    const nodes = getNodesToAdd(rootNode);
    return nodes.every((item) => checkBoxes.some((i) => i.code.id === item.code.id));
  };
  const content = (
    <>
      {user.isSuccess && allCodes.isSuccess && codeTree ? (
        <>
          {!showCheckboxes && (
            <Button
              variant="contained"
              onClick={() => codeCreationDialogRef.current!.open()}
              startIcon={<AddBoxIcon />}
              sx={{ my: 0.5, mx: 2 }}
            >
              Add Code
            </Button>
          )}
          {!showCheckboxes && <Divider />}
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
                {showCheckboxes ? (
                  <Checkbox
                    key={node?.code.id}
                    checked={isChecked(node)}
                    onChange={(event) => handleCheckboxChange(event, node)}
                  />
                ) : (
                  <>
                    <CodeToggleVisibilityButton code={node} />
                    <CodeEditButton code={node.code} />
                    <MemoButton attachedObjectId={node.code.id} attachedObjectType={AttachedObjectType.CODE} />
                  </>
                )}
                {}
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
