import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";
import ExportTagsButton from "../../Export/ExportTagsButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import TagMenuCreateButton from "../TagMenu/TagMenuCreateButton.tsx";
import TagExplorerActionMenu from "./TagExplorerActionMenu.tsx";
import useComputeTagTree from "./useComputeTagTree.ts";

const renderActions = (node: IDataTree) => <TagExplorerActionMenu node={node} />;

interface TagExplorerProps {
  onTagClick?: (tagId: number) => void;
}

function TagExplorer({ onTagClick, ...props }: TagExplorerProps & BoxProps) {
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
}

function ListActions() {
  return (
    <>
      <TagMenuCreateButton tagName="" />
      <ExportTagsButton />
    </>
  );
}

export default memo(TagExplorer);
