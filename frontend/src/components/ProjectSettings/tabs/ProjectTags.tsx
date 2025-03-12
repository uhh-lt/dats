import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { useState } from "react";
import TagCreateDialog from "../../Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../Tag/TagEditDialog.tsx";
import TagEditButton from "../../Tag/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../Tag/TagExplorer/useComputeTagTree.ts";
import TagMenuCreateButton from "../../Tag/TagMenu/TagMenuCreateButton.tsx";
import TreeExplorer from "../../TreeExplorer/TreeExplorer.tsx";

function ProjectTags() {
  // custom hooks
  const { tagTree, allTags } = useComputeTagTree();

  // local client state
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");

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
            onDataFilterChange={setTagFilter}
            // expansion
            expandedItems={expandedTagIds}
            onExpandedItemsChange={setExpandedTagIds}
            // actions
            renderActions={(node) => (
              <>
                <TagEditButton tag={node.data} />
              </>
            )}
            renderListActions={() => (
              <>
                <TagMenuCreateButton tagName="" />
              </>
            )}
          />
          <TagEditDialog tags={allTags.data} />
        </>
      )}
      <TagCreateDialog />
    </Box>
  );
}

export default ProjectTags;
