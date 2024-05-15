import LabelIcon from "@mui/icons-material/Label";
import { Box, BoxProps } from "@mui/material";
import { useCallback, useState } from "react";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import TagCreateDialog from "../../features/CrudDialog/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../features/CrudDialog/Tag/TagEditDialog.tsx";
import ExporterButton from "../../features/Exporter/ExporterButton.tsx";
import MemoButton from "../../features/Memo/MemoButton.tsx";
import TagEditButton from "../../features/TagExplorer/TagEditButton.tsx";
import useComputeTagTree from "../../features/TagExplorer/useComputeTagTree.ts";
import { IDataTree } from "../../features/TreeExplorer/IDataTree.ts";
import TreeExplorer from "../../features/TreeExplorer/TreeExplorer.tsx";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants.ts";
import TagMenuCreateButton from "./ToolBar/ToolBarElements/TagMenu/TagMenuCreateButton.tsx";

interface TagExplorerNewProps {
  onTagClick?: (tagId: number) => void;
}

function TagExplorerNew({ onTagClick, ...props }: TagExplorerNewProps & BoxProps) {
  // custom hooks
  const { tagTree, allTags } = useComputeTagTree();

  // local client state
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("");
  const expandTags = useCallback((tagsToExpand: string[]) => {
    setExpandedTagIds((prev) => {
      for (const tagId of tagsToExpand) {
        if (prev.indexOf(tagId) === -1) {
          prev.push(tagId);
        }
      }
      return prev.slice();
    });
  }, []);

  // expansion
  // const { nodesToExpand, filteredTagTree } = React.useMemo(() => {
  //   if (allTags.data) {
  //     const filteredData = filterTree({
  //       dataTree: tagTree as Node<IDataTree>,
  //       dataFilter: tagFilter,
  //     });
  //     return { nodesToExpand: filteredData.nodesToExpand, filteredTagTree: filteredData.dataTree as Node<IDataTree> };
  //   } else {
  //     return { nodesToExpand: [], filteredTagTree: null };
  //   }
  // }, [allTags.data, tagFilter, tagTree]);

  // React.useEffect(() => {
  //   setExpandedTagIds(() => Array.from(nodesToExpand).map((id) => id.toString()));
  // }, [nodesToExpand]);

  // handle ui events
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    expandTags([nodeId]);
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedTagIds.indexOf(nodeId);
    const newTagIds = [...expandedTagIds];
    newTagIds.splice(id, 1);
    setExpandedTagIds(newTagIds);
  };

  return (
    <Box {...props}>
      {allTags.isSuccess && tagTree && (
        <>
          <TreeExplorer
            sx={{ pt: 0 }}
            dataType={KEYWORD_TAGS}
            dataIcon={LabelIcon}
            // data
            allData={allTags.data}
            dataTree={tagTree}
            // filter
            showFilter
            dataFilter={tagFilter}
            setDataFilter={setTagFilter}
            // expansion
            expandedDataIds={expandedTagIds}
            handleCollapseClick={handleCollapseClick}
            handleExpandClick={handleExpandClick}
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
