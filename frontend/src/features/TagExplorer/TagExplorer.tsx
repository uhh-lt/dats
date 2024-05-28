import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { useState } from "react";
import TagMenuCreateButton from "../../views/search/ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton.tsx";
import TagEditDialog from "../CrudDialog/Tag/TagEditDialog.tsx";
import ExporterButton from "../Exporter/ExporterButton.tsx";
import TreeExplorer from "../TreeExplorer/TreeExplorer.tsx";
import TagExplorerMenu from "./TagExplorerMenu.tsx";
import useComputeTagTree from "./useComputeTagTree.ts";

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
            renderActions={(node) => <TagExplorerMenu tag={node} />}
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
    </Box>
  );
}

export default TagExplorerNew;
