import AddBoxIcon from "@mui/icons-material/AddBox";
import { AppBar, Button, Checkbox, Divider, Paper, PaperProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Tree, { Node } from "ts-tree-structure";
import { AttachedObjectType } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { useAuth } from "../../../auth/AuthProvider";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import { AnnoActions } from "../annoSlice";
import SpanCreationDialog, { CodeCreationDialogHandle } from "../SpanContextMenu/SpanCreationDialog";
import CodeEditButton from "./CodeEditButton";
import CodeEditDialog from "./CodeEditDialog";
import CodeExplorerContextMenu from "./CodeExplorerContextMenu";
import CodeToggleVisibilityButton from "./CodeToggleVisibilityButton";
import CodeTreeView from "./CodeTreeView";
import ICodeTree from "./ICodeTree";
import { codesToTree, flatTree, flatTreeWithRoot } from "./TreeUtils";

interface CodeExplorerProps {
  showToolbar?: boolean;
  showCheckboxes?: boolean;
  showCreateCodeButton?: boolean;
}

export interface CodeExplorerHandle {
  getSelectedCodeIds: () => number[];
}

const CodeExplorer = forwardRef<CodeExplorerHandle, CodeExplorerProps & PaperProps>(
  ({ showToolbar, showCheckboxes, showCreateCodeButton, ...props }, ref) => {
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

    // checkboxes
    const [checkedCodeIds, setCheckedCodeIds] = useState<number[]>([]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, node: ICodeTree) => {
      event.stopPropagation();

      // get ids of the code and all its children
      const codeIds = [node.code.id];
      if (node.children) {
        codeIds.push(...flatTree(node).map((c) => c.id));
      }

      // toggle the code ids
      setCheckedCodeIds((prevCheckedCodeIds) => {
        if (prevCheckedCodeIds.includes(node.code.id)) {
          // remove all codeIds
          return prevCheckedCodeIds.filter((id) => !codeIds.includes(id));
        } else {
          // add all codeIds (that are not already present)
          return [...prevCheckedCodeIds, ...codeIds.filter((id) => !prevCheckedCodeIds.includes(id))];
        }
      });

      // console.log(codeIds);
      // console.log("ids");

      // const { checked } = event.target;
      // let newCheckBoxes = checkBoxes.slice();
      // const index = newCheckBoxes.findIndex((item) => item.code.id === node.code.id);

      // if (checked) {
      //   const nodesToAdd = getNodesToAdd(node);
      //   const nodesToAddIds = nodesToAdd.map((n) => n.code.id);
      //   newCheckBoxes = newCheckBoxes.filter((item) => !nodesToAddIds.includes(item.code.id));
      //   newCheckBoxes.push(...nodesToAdd);
      // } else {
      //   const nodesToRemove = getNodesToRemove(node);
      //   const nodesToRemoveIds = nodesToRemove.map((n) => n.code.id);
      //   newCheckBoxes = newCheckBoxes.filter((item) => !nodesToRemoveIds.includes(item.code.id));
      // }

      // dispatch(CheckBoxActions.toggleCheckBox(newCheckBoxes));
    };

    // const getNodesToAdd = (node: any) => {
    //   const nodes: any[] = [node];

    //   if (node.children) {
    //     node.children.forEach((child: any) => {
    //       if (!isChecked(child)) {
    //         nodes.push(...getNodesToAdd(child));
    //       }
    //     });
    //   }

    //   return nodes;
    // };

    // const getNodesToRemove = (node: any) => {
    //   const nodes: any[] = [];

    //   if (node.children) {
    //     node.children.forEach((child: any) => {
    //       if (isChecked(child)) {
    //         nodes.push(...getNodesToRemove(child));
    //       }
    //     });
    //   }

    //   nodes.push(node);
    //   return nodes;
    // };

    const isChecked = (node: ICodeTree): boolean => {
      // a node is checked if it's id as well as all of its children are in the checkedCodeIds array
      return checkedCodeIds.indexOf(node.code.id) !== -1 && (node.children?.every(isChecked) || true);
    };

    const isIndeterminate = (node: ICodeTree) => {
      if (!node.children) {
        return false;
      }
      const numCheckedChildren = node.children.filter(isChecked).length + (isChecked(node) ? 1 : 0);
      return numCheckedChildren > 0 && numCheckedChildren < node.children.length + 1;
    };

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      getSelectedCodeIds: () => checkedCodeIds,
    }));

    const content = (
      <>
        {user.isSuccess && allCodes.isSuccess && codeTree ? (
          <>
            {showCreateCodeButton && (
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
              </>
            )}
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
                      key={node.code.id}
                      checked={isChecked(node)}
                      indeterminate={isIndeterminate(node)}
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
);

export default CodeExplorer;
