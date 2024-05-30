import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { useState } from "react";
import TagCreateDialog from "../../../components/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../../components/Tag/TagEditDialog.tsx";
import TagEditButton from "../../../components/Tag/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../../components/Tag/TagExplorer/useComputeTagTree.ts";
import TagMenuCreateButton from "../../../components/Tag/TagMenu/TagMenuCreateButton.tsx";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";

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
            allData={allTags.data}
            dataTree={tagTree}
            // filter
            showFilter
            dataFilter={tagFilter}
            onDataFilterChange={setTagFilter}
            // expansion
            expandedDataIds={expandedTagIds}
            onExpandedDataIdsChange={setExpandedTagIds}
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
