import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { FolderRead } from "../../../api/openapi/models/FolderRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";
import { ITree } from "../../TreeExplorer/ITree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import FolderExplorerActionMenu from "./FolderExplorerActionMenu.tsx";
import FolderMenuCreateButton from "./FolderMenuCreateButton.tsx";
import useComputeFolderTree from "./useComputeFolderTree.ts";

const renderActions = (node: ITree<FolderRead>) => <FolderExplorerActionMenu node={node} />;

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
          dataIcon={LabelIcon}
          // data
          dataTree={folderTree}
          // filter
          showFilter
          dataFilter={FolderFilter}
          onDataFilterChange={handleFolderFilterChange}
          // expansion
          expandedItems={expandedFolderIds}
          onExpandedItemsChange={handleExpandedFolderIdsChange}
          // actions
          onItemClick={onFolderClick ? handleFolderClick : undefined}
          // renderers
          renderActions={renderActions}
          // components
          listActions={<ListActions />}
        />
      )}
    </Box>
  );
}

function ListActions() {
  return <FolderMenuCreateButton folderName="" />;
}

export default memo(FolderExplorer);
