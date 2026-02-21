import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { ExportTagsButton } from "../../../components/Export/ExportTagsButton.tsx";
import { ITree } from "../../../components/TreeExplorer/ITree.ts";
import { TreeExplorer } from "../../../components/TreeExplorer/TreeExplorer.tsx";
import { SearchActions } from "../../../features/search/DocumentSearch/searchSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TagCreateListItemButton } from "../dialog/TagCreateListItemButton.tsx";
import { TagExplorerActionMenu } from "./components/TagExplorerActionMenu.tsx";
import { useComputeTagTree } from "./hooks/useComputeTagTree.ts";

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
      <ExportTagsButton />
    </>
  );
}
