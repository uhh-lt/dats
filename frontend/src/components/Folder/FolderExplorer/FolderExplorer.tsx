import FolderIcon from "@mui/icons-material/Folder";
import InboxIcon from "@mui/icons-material/Inbox";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { FolderRead } from "../../../api/openapi/models/FolderRead.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";
import { ITree } from "../../TreeExplorer/ITree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import FolderCreateButton from "../FolderCreateButton.tsx";
import FolderExplorerActionMenu from "./FolderExplorerActionMenu.tsx";
import useComputeFolderTree from "./useComputeFolderTree.ts";

const renderActions = (node: ITree<FolderRead>) => <FolderExplorerActionMenu node={node} />;
const isDroppable = (node: ITree<FolderRead>) => node.data.folder_type === FolderType.NORMAL;
const getDroppableId = (node: ITree<FolderRead>) => `folder-${node.data.id}`;

interface FolderExplorerProps {
  onFolderClick?: (FolderId: number) => void;
}

function FolderExplorer({ onFolderClick, ...props }: FolderExplorerProps & BoxProps) {
  // custom hooks
  const { folderTree } = useComputeFolderTree();

  // Folder expansion
  const dispatch = useAppDispatch();
  const expandedFolderIds = useAppSelector((state) => state.search.expandedFolderIds);
  const handleExpandedFolderIdsChange = useCallback(
    (folderIds: string[]) => {
      dispatch(SearchActions.setExpandedFolderIds(folderIds));
    },
    [dispatch],
  );

  // Folder selection
  const selectedFolderId = useAppSelector((state) => state.search.selectedFolderId);
  const handleSelectedFolderIdChange = useCallback(
    (_event: React.SyntheticEvent, folderId: string | string[] | null) => {
      if (typeof folderId === "string") {
        dispatch(SearchActions.setSelectedFolderId(parseInt(folderId)));
      } else {
        dispatch(SearchActions.setSelectedFolderId(-1)); // the root folder is -1
      }
    },
    [dispatch],
  );

  // local client state
  const [FolderFilter, setFolderFilter] = useState<string>("");

  const handleFolderFilterChange = useCallback((newFilter: string) => {
    setFolderFilter(newFilter);
  }, []);

  const handleFolderClick = useCallback(
    (_: React.MouseEvent, FolderId: string) => {
      onFolderClick?.(parseInt(FolderId));
    },
    [onFolderClick],
  );

  return (
    <Box {...props}>
      {folderTree && (
        <TreeExplorer
          sx={{ pt: 0 }}
          dataIcon={FolderIcon}
          // data
          dataTree={folderTree}
          // filter
          showFilter
          dataFilter={FolderFilter}
          onDataFilterChange={handleFolderFilterChange}
          // expansion
          expandedItems={expandedFolderIds}
          onExpandedItemsChange={handleExpandedFolderIdsChange}
          // selection
          selectedItems={selectedFolderId}
          onSelectedItemsChange={handleSelectedFolderIdChange}
          // actions
          onItemClick={onFolderClick ? handleFolderClick : undefined}
          // renderers
          renderActions={renderActions}
          // components
          listActions={<ListActions />}
          // root node rendering
          renderRoot={true}
          disableRootActions={true}
          // icons
          rootIcon={InboxIcon}
          // dnd
          droppable={isDroppable}
          droppableId={getDroppableId}
        />
      )}
    </Box>
  );
}

function ListActions() {
  return <FolderCreateButton folderName="" />;
}

export default memo(FolderExplorer);
