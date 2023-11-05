import AddBoxIcon from "@mui/icons-material/AddBox";
import { AppBar, Box, BoxProps, Button, Checkbox, List, Stack, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { AttachedObjectType } from "../../api/openapi";
import { useAuth } from "../../auth/AuthProvider";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";
import TagCreateDialog, { openTagCreateDialog } from "../CrudDialog/Tag/TagCreateDialog";
import TagEditDialog from "../CrudDialog/Tag/TagEditDialog";
import ExporterButton from "../Exporter/ExporterButton";
import MemoButton from "../Memo/MemoButton";
import { ITagTree } from "./ITagTree";
import TagEditButton from "./TagEditButton";
import TagExplorerContextMenu from "./TagExplorerContextMenu";
import TagTreeView from "./TagTreeView";
import { flatTree } from "./TreeUtils";
import useComputeTagTree from "./useComputeTagTree";
import TagMenuCreateButton from "../../views/search/ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton";

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

    // custom hooks
    const { tagTree, allTags } = useComputeTagTree();

    // local client state
    const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
    const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);

    // handle ui events
    const handleSelectTag = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
      const tagId = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
      setSelectedTagId(tagId);
    };
    const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      setExpandedTagIds((prevExpandedTagIds) => [nodeId, ...prevExpandedTagIds]);
    };
    const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      const id = expandedTagIds.indexOf(nodeId);
      const newTagIds = [...expandedTagIds];
      newTagIds.splice(id, 1);
      setExpandedTagIds(newTagIds);
    };

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

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      getCheckedTagIds: () => checkedTagIds,
    }));

    const content = (
      <>
        {user.isSuccess && allTags.isSuccess && tagTree ? (
          <>
            <TagTreeView
              className="myFlexFillAllContainer"
              data={tagTree.model}
              multiSelect={false}
              selected={selectedTagId?.toString() || ""}
              expanded={expandedTagIds}
              onNodeSelect={handleSelectTag}
              onExpandClick={handleExpandClick}
              onCollapseClick={handleCollapseClick}
              onTagClick={onTagClick ? (tag) => onTagClick(tag.id) : undefined}
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
        ) : user.isError ? (
          <>{user.error.message}</>
        ) : allTags.isError ? (
          <>{allTags.error.message}</>
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
                Tag Explorer
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
              <TagMenuCreateButton tagName="" sx={{ px: 1.5 }} />
            </List>

            <ExporterButton
              tooltip="Export tagset"
              exporterInfo={{ type: "Tagset", singleUser: false, users: [], sdocId: -1 }}
              iconButtonProps={{ color: "inherit" }}
            />
          </Stack>
        )}
        {content}
      </Box>
    );
  },
);

export default TagExplorer;
