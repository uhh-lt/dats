import { ITree, TreeExplorer } from "@components/tree-explorer";
import { TagRead } from "@models/TagRead";
import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { TagCreateListItemButton } from "../dialog";
import { TagExportButton } from "../TagExportButton";
import { TagExplorerActionMenu } from "./_components/TagExplorerActionMenu";
import { useComputeTagTree } from "./useComputeTagTree";

const renderActions = (node: ITree<TagRead>) => <TagExplorerActionMenu node={node} />;

interface TagExplorerProps {
  onTagClick?: (tagId: number) => void;
  expandedTagIds: string[];
  onExpandedTagIdsChange: (ids: string[]) => void;
}

export const TagExplorer = memo(
  ({ onTagClick, expandedTagIds, onExpandedTagIdsChange, ...props }: TagExplorerProps & BoxProps) => {
    // custom hooks
    const { tagTree } = useComputeTagTree();

    // local client state
    const [tagFilter, setTagFilter] = useState<string>("");

    const handleTagFilterChange = useCallback((newFilter: string) => {
      setTagFilter(newFilter);
    }, []);

    const handleTagClick = useCallback(
      (_: React.MouseEvent, tagId: string) => {
        onTagClick?.(parseInt(tagId));
      },
      [onTagClick],
    );

    return (
      <Box {...props}>
        {tagTree && (
          <TreeExplorer
            sx={{ pt: 0 }}
            dataIcon={LabelIcon}
            // data
            dataTree={tagTree}
            // filter
            showFilter
            dataFilter={tagFilter}
            onDataFilterChange={handleTagFilterChange}
            // expansion
            expandedItems={expandedTagIds}
            onExpandedItemsChange={onExpandedTagIdsChange}
            // actions
            onItemClick={onTagClick ? handleTagClick : undefined}
            // renderers
            renderActions={renderActions}
            // components
            listActions={<ListActions />}
          />
        )}
      </Box>
    );
  },
);

function ListActions() {
  return (
    <>
      <TagCreateListItemButton tagName="" />
      <TagExportButton />
    </>
  );
}
