import { TagRead } from "@api/models/TagRead";
import { ITree, TreeExplorer } from "@components/tree-explorer";
import { TagCreateListItemButton, TagEditButton , useComputeTagTree  } from "@core/tag";
import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { memo, useCallback, useState } from "react";

const renderTagActions = (node: ITree<TagRead>) => <TagEditButton tag={node.data} />;

export const ProjectTags = memo(() => {
  // custom hooks
  const { tagTree } = useComputeTagTree();

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
          // renderer
          renderActions={renderTagActions}
          // components
          listActions={<TagCreateListItemButton tagName="" />}
        />
      )}
    </Box>
  );
});
