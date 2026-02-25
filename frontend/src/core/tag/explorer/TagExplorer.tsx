import { ITree, TreeExplorer } from "@components/tree-explorer";
import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, useCallback, useState } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead";
import { SearchActions } from "../../../features/search/DocumentSearch/searchSlice";
import { TagCreateListItemButton } from "../dialog/TagCreateListItemButton";
import { TagExportButton } from "../TagExportButton";
import { TagExplorerActionMenu } from "./_components/TagExplorerActionMenu";
import { useComputeTagTree } from "./useComputeTagTree";

const renderActions = (node: ITree<TagRead>) => <TagExplorerActionMenu node={node} />;

interface TagExplorerProps {
  onTagClick?: (tagId: number) => void;
}

export const TagExplorer = memo(({ onTagClick, ...props }: TagExplorerProps & BoxProps) => {
  // custom hooks
  const { tagTree } = useComputeTagTree();

  // tag expansion
  const dispatch = useAppDispatch();
  const expandedTagIds = useAppSelector((state) => state.search.expandedTagIds);
  const handleExpandedTagIdsChange = useCallback(
    (tagIds: string[]) => {
      dispatch(SearchActions.setExpandedTagIds(tagIds));
    },
    [dispatch],
  );

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
          onExpandedItemsChange={handleExpandedTagIdsChange}
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
});

function ListActions() {
  return (
    <>
      <TagCreateListItemButton tagName="" />
      <TagExportButton />
    </>
  );
}
