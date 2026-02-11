import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";
import ExportTagsButton from "../../Export/ExportTagsButton.tsx";
import { ITree } from "../../TreeExplorer/ITree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import { flatTree } from "../../TreeExplorer/TreeUtils.ts";
import { useTreeSortOrder } from "../../../hooks/useTreeSortOrder.ts";
import TagMenuCreateButton from "../TagMenu/TagMenuCreateButton.tsx";
import TagExplorerActionMenu from "./TagExplorerActionMenu.tsx";
import useComputeTagTree from "./useComputeTagTree.ts";

const renderActions = (node: ITree<TagRead>) => <TagExplorerActionMenu node={node} />;

interface TagExplorerProps {
  onTagClick?: (tagId: number) => void;
  projectId?: number;
}

function TagExplorer({ onTagClick, projectId, ...props }: TagExplorerProps & BoxProps) {
  // custom hooks
  const { tagTree, allTags } = useComputeTagTree();

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

  // Get all tag IDs from the tree
  const allTagIds = useMemo(() => {
    if (!tagTree) return [];
    return flatTree(tagTree.model).map((tag) => tag.id);
  }, [tagTree]);

  // Extract projectId from data for dependency tracking
  const dataProjectId = allTags.data?.[0]?.project_id;

  // Use project ID from props or derive from data (fallback)
  const effectiveProjectId = useMemo(() => {
    return projectId ?? dataProjectId;
  }, [projectId, dataProjectId]);

  // Use custom sort order hook
  const { sortOrder, updateSortOrder } = useTreeSortOrder(
    "tag-sort-order",
    effectiveProjectId,
    allTagIds
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
          // drag and drop for reordering
          draggableItems={true}
          sortOrder={sortOrder}
          onSortOrderChange={updateSortOrder}
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
