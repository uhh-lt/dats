import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";
import ExporterButton from "../../Exporter/ExporterButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";
import TagEditDialog from "../TagEditDialog.tsx";
import TagMenuCreateButton from "../TagMenu/TagMenuCreateButton.tsx";
import TagExplorerMenu from "./TagExplorerMenu.tsx";
import useComputeTagTree from "./useComputeTagTree.ts";

interface TagExplorerNewProps {
  onTagClick?: (tagId: number) => void;
}

const listActions = (
  <>
    <TagMenuCreateButton tagName="" />
    <ExporterButton
      tooltip="Export tagset"
      exporterInfo={{ type: "Tagset", singleUser: false, users: [], sdocId: -1 }}
      iconButtonProps={{ color: "inherit" }}
    />
  </>
);

function TagExplorer({ onTagClick, ...props }: TagExplorerNewProps & BoxProps) {
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

  const renderActions = useCallback((node: IDataTree) => <TagExplorerMenu tag={node} />, []);

  return (
    <Box {...props}>
      {allTags.isSuccess && tagTree && (
        <>
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
            renderActions={renderActions}
            // components
            listActions={listActions}
          />
          <TagEditDialog tags={allTags.data} />
        </>
      )}
    </Box>
  );
}

export default memo(TagExplorer);
