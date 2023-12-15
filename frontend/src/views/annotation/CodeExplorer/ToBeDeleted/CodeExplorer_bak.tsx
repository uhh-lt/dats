import AddIcon from "@mui/icons-material/Add";
import {
  AppBar,
  Box,
  BoxProps,
  Checkbox,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { AttachedObjectType } from "../../../../api/openapi";
import { useAuth } from "../../../../auth/AuthProvider";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition";
import { openCodeCreateDialog } from "../../../../features/CrudDialog/Code/CodeCreateDialog";
import CodeEditDialog from "../../../../features/CrudDialog/Code/CodeEditDialog";
import ExporterButton from "../../../../features/Exporter/ExporterButton";
import MemoButton from "../../../../features/Memo/MemoButton";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { AnnoActions } from "../../annoSlice";
import CodeEditButton from "../CodeEditButton";
import CodeExplorerContextMenu from "../CodeExplorerContextMenu";
import CodeToggleVisibilityButton from "../CodeToggleVisibilityButton";
import CodeTreeView from "../CodeTreeView";
import ICodeTree from "../ICodeTree";
import { flatTree, flatTreeWithRoot } from "../TreeUtils";
import useComputeCodeTree from "../useComputeCodeTree";

interface CodeExplorerProps {
  showToolbar?: boolean;
  showCheckboxes?: boolean;
  showButtons?: boolean;
}

export interface CodeExplorerHandle {
  getCheckedCodeIds: () => number[];
}

const CodeExplorer = forwardRef<CodeExplorerHandle, CodeExplorerProps & BoxProps>(
  ({ showToolbar, showCheckboxes, showButtons, ...props }, ref) => {
    const { user } = useAuth();

    // custom hooks
    const { codeTree, allCodes } = useComputeCodeTree();

    // global client state (redux)
    const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
    const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
    const dispatch = useAppDispatch();

    // effects
    // update global client state when selection changes
    // we tell the annotator which codes are available for selection in the combobox
    useEffect(() => {
      if (selectedCodeId && codeTree) {
        let parentCode = codeTree.first((node) => node.model.code.id === selectedCodeId);
        if (parentCode && parentCode.model) {
          // the selected code was found -> we update the codes for selection
          dispatch(AnnoActions.setCodesForSelection(flatTreeWithRoot(parentCode.model)));
        } else {
          // the selected code was not found -> the selected code was invalid (probabily because of local storage / project change...)
          dispatch(AnnoActions.setSelectedParentCodeId(undefined));
        }
      } else if (allCodes.data) {
        dispatch(AnnoActions.setCodesForSelection(allCodes.data));
      } else {
        dispatch(AnnoActions.setCodesForSelection([]));
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
    };

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
      getCheckedCodeIds: () => checkedCodeIds,
    }));

    const content = (
      <>
        {user && allCodes.isSuccess && codeTree ? (
          <>
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
            <CodeExplorerContextMenu
              node={contextMenuData}
              position={contextMenuPosition}
              handleClose={() => setContextMenuPosition(null)}
            />
          </>
        ) : allCodes.isError ? (
          <>{allCodes.error.message}</>
        ) : (
          "Loading..."
        )}
      </>
    );

    return (
      <Box className="h100 myFlexContainer" {...props}>
        {showToolbar && (
          <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
            <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
              <Typography variant="h6" color="inherit" component="div">
                Code Explorer
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        {showButtons && (
          <Stack
            direction="row"
            className="myFlexFitContentContainer"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              alignItems: "center",
            }}
          >
            <List sx={{ flexGrow: 1, mr: 1 }} disablePadding>
              <ListItemButton sx={{ px: 1.5 }} onClick={() => openCodeCreateDialog({ parentCodeId: selectedCodeId })}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Create new code" />
              </ListItemButton>
            </List>

            <ExporterButton
              tooltip="Export codeset"
              exporterInfo={{ type: "Codeset", singleUser: true, users: [], sdocId: -1 }}
              iconButtonProps={{ color: "inherit" }}
            />
          </Stack>
        )}
        {content}
      </Box>
    );
  },
);

export default CodeExplorer;
