import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  BoxProps,
  CardContent,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import Tree from "ts-tree-structure";
import { ProjectProps } from "../../views/projectsettings/update/ProjectProps";
import ProjectHooks from "../../api/ProjectHooks";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree";
import { codesToTree } from "../../views/annotation/CodeExplorer/TreeUtils";
import { AttachedObjectType, CodeRead } from "../../api/openapi";
import CodeToggleEnabledButton from "../../views/annotation/CodeExplorer/CodeToggleEnabledButton";
import CodeCreateDialog, { openCodeCreateDialog } from "../CrudDialog/Code/CodeCreateDialog";
import CodeTreeView from "../../views/annotation/CodeExplorer/CodeTreeView";
import CodeToggleVisibilityButton from "../../views/annotation/CodeExplorer/CodeToggleVisibilityButton";
import CodeEditButton from "../../views/annotation/CodeExplorer/CodeEditButton";
import CodeEditDialog from "../CrudDialog/Code/CodeEditDialog";
import useComputeTagTree from "./useComputeTagTree";
import { flatTree, tagsToTree } from "./TreeUtils";
import { ITagTree } from "./ITagTree";
import TagTreeView from "./TagTreeView";
import TagEditButton from "./TagEditButton";
import MemoButton from "../Memo/MemoButton";
import TagEditDialog from "../CrudDialog/Tag/TagEditDialog";
import TagExplorerContextMenu from "./TagExplorerContextMenu";
import { useAuth } from "../../auth/AuthProvider";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";
import TagCreationButton from "../../views/search/ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton";
import ExporterButton from "../Exporter/ExporterButton";

interface TagExplorerProps {
  showToolbar?: boolean;
  showCheckboxes?: boolean;
  showButtons?: boolean;
  onTagClick?: (tagId: number) => void;
}

export interface TagExplorerHandle {
  getCheckedTagIds: () => number[];
}

const TagExplorer = forwardRef<TagExplorerHandle, TagExplorerProps & BoxProps>(
  ({ showToolbar, showCheckboxes, showButtons, onTagClick, ...props }, ref) => {
    const { user } = useAuth();

    // local state
    const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
    const [codeFilter, setCodeFilter] = useState<string>("");
    const expandCodes = useCallback((codesToExpand: string[]) => {
      setExpandedCodeIds((prev) => {
        for (const codeId of codesToExpand) {
          if (prev.indexOf(codeId) === -1) {
            prev.push(codeId);
          }
        }
        return prev.slice();
      });
    }, []);

    // global server state (react query)
    // custom hooks
    const allTags = useComputeTagTree().allTags;

    // computed
    const { tagTree, nodesToExpand } = useMemo(() => {
      if (allTags.data) {
        // build the tree
        const tagTree = new Tree().parse<ITagTree>(tagsToTree(allTags.data));

        const nodesToExpand = new Set<number>();

        if (codeFilter.trim().length > 0) {
          const nodesToKeep = new Set<number>();

          // find all nodes that match the filter
          tagTree.walk(
            (node) => {
              if (node.model.data.title.startsWith(codeFilter.trim())) {
                // keep the node
                nodesToKeep.add(node.model.data.id);

                // keep its children
                node.children.map((child) => child.model.data.id).forEach((id) => nodesToKeep.add(id));

                // keep its parents
                let parent = node.parent;
                while (parent) {
                  nodesToKeep.add(parent.model.data.id);
                  nodesToExpand.add(parent.model.data.id);
                  parent = parent.parent;
                }
              }
              return true;
            },
            { strategy: "breadth" }
          );

          // filter the codeTree
          let nodes_to_remove = tagTree.all((node) => !nodesToKeep.has(node.model.data.id));
          nodes_to_remove.forEach((node) => {
            node.drop();
          });
        }

        return { tagTree, nodesToExpand };
      } else {
        return { tagTree: null, nodesToExpand: new Set<number>() };
      }
    }, [allTags.data, codeFilter]);

    // effects
    // automatically expand filtered nodes
    useEffect(() => {
      expandCodes(Array.from(nodesToExpand).map((id) => id.toString()));
    }, [expandCodes, nodesToExpand]);

    // ui event handlers
    const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      expandCodes([nodeId]);
    };
    const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      const id = expandedCodeIds.indexOf(nodeId);
      const newCodeIds = [...expandedCodeIds];
      newCodeIds.splice(id, 1);
      setExpandedCodeIds(newCodeIds);
    };

    //code from tagExplorer
    // context menu
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
    const [contextMenuData, setContextMenuData] = useState<ITagTree>();
    const onContextMenu = (node: ITagTree) => (event: any) => {
      event.preventDefault();
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuData(node);
    };

    // checkboxes
    const [checkedTagIds, setCheckedTagIds] = useState<number[]>([]);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, node: ITagTree) => {
      event.stopPropagation();

      // get ids of the tag and all its children
      const tagIds = [node.data.id];
      if (node.children) {
        tagIds.push(...flatTree(node).map((c) => c.id));
      }

      // toggle the tag ids
      setCheckedTagIds((prevCheckedTagIds) => {
        if (prevCheckedTagIds.includes(node.data.id)) {
          // remove all tagIds
          return prevCheckedTagIds.filter((id) => !tagIds.includes(id));
        } else {
          // add all tagIds (that are not already present)
          return [...prevCheckedTagIds, ...tagIds.filter((id) => !prevCheckedTagIds.includes(id))];
        }
      });
    };
    const isChecked = (node: ITagTree): boolean => {
      // a node is checked if it's id as well as all of its children are in the checkedTagIds array
      return checkedTagIds.indexOf(node.data.id) !== -1 && (node.children?.every(isChecked) || true);
    };

    const isIndeterminate = (node: ITagTree) => {
      if (!node.children) {
        return false;
      }
      const numCheckedChildren = node.children.filter(isChecked).length + (isChecked(node) ? 1 : 0);
      return numCheckedChildren > 0 && numCheckedChildren < node.children.length + 1;
    };

    return (
      <Box display="flex" className="myFlexContainer h100">
        <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
          <Typography variant="h6" color="inherit" component="div">
            Filter tags
          </Typography>
          <TextField
            sx={{ ml: 1, flex: 1 }}
            placeholder={"type name here..."}
            variant="outlined"
            size="small"
            value={codeFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setCodeFilter(event.target.value);
            }}
          />
          {/* <CodeToggleEnabledButton code={tagTree?.model} /> */}
        </Toolbar>
        <Divider />

        {allTags.isLoading && <CardContent>Loading project codes...</CardContent>}
        {allTags.isError && <CardContent>An error occurred while loading project codes for project...</CardContent>}
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
            <TagCreationButton tagName="" sx={{ px: 1.5 }} />
          </List>

          <ExporterButton
            tooltip="Export tagset"
            exporterInfo={{ type: "Tagset", singleUser: false, users: [], sdocId: -1 }}
            iconButtonProps={{ color: "inherit" }}
          />
        </Stack>
        {allTags.isSuccess && tagTree && (
          <>
            <TagTreeView
              className="myFlexFillAllContainer"
              data={tagTree.model}
              multiSelect={false}
              disableSelection
              expanded={expandedCodeIds}
              onExpandClick={handleExpandClick}
              onCollapseClick={handleCollapseClick}
              renderActions={(node) => (
                <React.Fragment>
                  {showCheckboxes ? (
                    <Checkbox
                      key={node.data.id}
                      checked={isChecked(node)}
                      indeterminate={isIndeterminate(node)}
                      onChange={(event) => handleCheckboxChange(event, node)}
                    />
                  ) : (
                    <>
                      <TagEditButton tag={node.data} />
                      <MemoButton
                        attachedObjectId={node.data.id}
                        attachedObjectType={AttachedObjectType.DOCUMENT_TAG}
                      />
                    </>
                  )}
                  {}
                </React.Fragment>
              )}
              openContextMenu={onContextMenu}
            />
            <TagEditDialog tags={allTags.data} />
            <TagExplorerContextMenu
              node={contextMenuData}
              position={contextMenuPosition}
              handleClose={() => setContextMenuPosition(null)}
            />
          </>
        )}
      </Box>
    );
  }
);

export default TagExplorer;
