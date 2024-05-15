import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import TagCreateDialog from "../../../features/CrudDialog/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../../features/CrudDialog/Tag/TagEditDialog.tsx";
import MemoButton from "../../../features/Memo/MemoButton.tsx";
import TagEditButton from "../../../features/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../../features/TagExplorer/useComputeTagTree.ts";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import TagMenuCreateButton from "../../search/ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton.tsx";

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
                <MemoButton attachedObjectId={node.data.id} attachedObjectType={AttachedObjectType.DOCUMENT_TAG} />
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
