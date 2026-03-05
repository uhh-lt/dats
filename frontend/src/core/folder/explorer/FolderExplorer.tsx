import { FolderRead } from "@api/models/FolderRead";
import { FolderType } from "@api/models/FolderType";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import FolderIcon from "@mui/icons-material/Folder";
import InboxIcon from "@mui/icons-material/Inbox";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { FolderCreateButton } from "../FolderCreateButton";
import { FolderExplorerActionMenu } from "./_components/FolderExplorerActionMenu";
import { FolderExplorerMenu } from "./_components/FolderExplorerMenu";
import { useComputeFolderTree } from "./_hooks/useComputeFolderTree";

const renderActions = (node: ITree<FolderRead>) => <FolderExplorerActionMenu node={node} />;
const isDroppable = (node: ITree<FolderRead>) => node.data.folder_type === FolderType.NORMAL;
const getDroppableId = (node: ITree<FolderRead>) => `folder-${node.data.id}`;

interface FolderExplorerProps {
  onFolderClick?: (folderId: number) => void;
  expandedFolderIds: string[];
  onExpandedFolderIdsChange: (ids: string[]) => void;
  selectedFolderId: number;
  onSelectedFolderIdChange: (folderId: number) => void;
  showFolders: boolean;
  onToggleShowFolders?: () => void;
}

export const FolderExplorer = memo(
  ({
    onFolderClick,
    expandedFolderIds,
    onExpandedFolderIdsChange,
    selectedFolderId,
    onSelectedFolderIdChange,
    showFolders,
    onToggleShowFolders,
    ...props
  }: FolderExplorerProps & BoxProps) => {
    // custom hooks
    const { folderTree } = useComputeFolderTree();

    // local client state
    const [folderFilter, setFolderFilter] = useState<string>("");

    const handleFolderFilterChange = useCallback((newFilter: string) => {
      setFolderFilter(newFilter);
    }, []);

    const handleSelectedFolderIdChange = useCallback(
      (_event: React.SyntheticEvent, folderId: string | string[] | null) => {
        if (typeof folderId === "string") {
          onSelectedFolderIdChange(parseInt(folderId));
        } else {
          onSelectedFolderIdChange(-1); // the root folder is -1
        }
      },
      [onSelectedFolderIdChange],
    );

    const handleFolderClick = useCallback(
      (_: React.MouseEvent, folderId: string) => {
        onFolderClick?.(parseInt(folderId));
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
            dataFilter={folderFilter}
            onDataFilterChange={handleFolderFilterChange}
            // expansion
            expandedItems={expandedFolderIds}
            onExpandedItemsChange={onExpandedFolderIdsChange}
            // selection
            selectedItems={selectedFolderId}
            onSelectedItemsChange={handleSelectedFolderIdChange}
            // actions
            onItemClick={onFolderClick ? handleFolderClick : undefined}
            // renderers
            renderActions={renderActions}
            // components
            listActions={<ListActions showFolders={showFolders} onToggleShowFolders={onToggleShowFolders} />}
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
  },
);

function ListActions({ showFolders, onToggleShowFolders }: { showFolders: boolean; onToggleShowFolders?: () => void }) {
  return (
    <>
      <FolderCreateButton folderName="" />
      <FolderExplorerMenu showFolders={showFolders} onToggleShowFolders={onToggleShowFolders} />
    </>
  );
}
