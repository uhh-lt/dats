import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { useState } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import TagCreateDialog from "../../../features/CrudDialog/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../../features/CrudDialog/Tag/TagEditDialog.tsx";
import ExporterButton from "../../../features/Exporter/ExporterButton.tsx";
import MemoButton from "../../../features/Memo/MemoButton.tsx";
import TagEditButton from "../../../features/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../../features/TagExplorer/useComputeTagTree.ts";
import { IDataTree } from "../../../features/TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import TagMenuCreateButton from "../ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton.tsx";

interface TagExplorerNewProps {
  onTagClick?: (tagId: number) => void;
}

function TagExplorerNew({ onTagClick, ...props }: TagExplorerNewProps & BoxProps) {
  // custom hooks
  const { tagTree, allTags } = useComputeTagTree();

  // local client state
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");

  return (
    <Box {...props}>
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
            onDataClick={onTagClick}
            renderActions={(node) => (
              <>
                <TagEditButton tag={(node as IDataTree).data} />
                <MemoButton attachedObjectId={node.data.id} attachedObjectType={AttachedObjectType.DOCUMENT_TAG} />
              </>
            )}
            renderListActions={() => (
              <>
                <TagMenuCreateButton tagName="" />
                <ExporterButton
                  tooltip="Export tagset"
                  exporterInfo={{ type: "Tagset", singleUser: false, users: [], sdocId: -1 }}
                  iconButtonProps={{ color: "inherit" }}
                />
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

export default TagExplorerNew;
