import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";
import TagCreateDialog from "../../Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../Tag/TagEditDialog.tsx";
import TagEditButton from "../../Tag/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../Tag/TagExplorer/useComputeTagTree.ts";
import TagMenuCreateButton from "../../Tag/TagMenu/TagMenuCreateButton.tsx";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";

const renderTagActions = (node: IDataTree) => <TagEditButton tag={node.data} />;

function ProjectTags() {
  // custom hooks
  const { tagTree, allTags } = useComputeTagTree();

  // local state
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");

  const handleTagFilterChange = useCallback((value: string) => {
    setTagFilter(value);
  }, []);

  const handleExpandedTagIdsChange = useCallback((ids: string[]) => {
    setExpandedTagIds(ids);
  }, []);

  return (
    <Box className="h100">
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
            // renderer
            renderActions={renderTagActions}
            // components
            listActions={<TagMenuCreateButton tagName="" />}
          />
          <TagEditDialog tags={allTags.data} />
        </>
      )}
      <TagCreateDialog />
    </Box>
  );
}

export default memo(ProjectTags);
