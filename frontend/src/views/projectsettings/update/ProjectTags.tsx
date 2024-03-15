import LabelIcon from "@mui/icons-material/Label";
import { Box } from "@mui/material";
import { useState } from "react";
import { Node } from "ts-tree-structure";
import TreeDataCreateDialog from "../../../features/CrudDialog/TreeData/TreeDataCreateDialog.tsx";
import { ITagTree } from "../../../features/TagExplorer/ITagTree.ts";
import useComputeTagTree from "../../../features/TagExplorer/useComputeTagTree.ts";
import TreeExplorer from "../../../features/TreeExplorer/TreeExplorer.tsx";
import { KEYWORD_TAGS } from "../../../utils/GlobalConstants.ts";
import { ProjectProps } from "./ProjectProps.ts";

function ProjectTags({ project }: ProjectProps) {
  // local client state
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([]);

  const [tagFilter, setTagFilter] = useState<string>("");

  // custom hooks
  let { tagTree, allTags } = useComputeTagTree();

  // handle ui events
  const handleSelectTag = (event: React.SyntheticEvent, nodeIds: string[] | string) => {
    const tagId = parseInt(Array.isArray(nodeIds) ? nodeIds[0] : nodeIds);
    setSelectedTagId(tagId);
  };
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    setExpandedTagIds((prevExpandedTagIds) => [nodeId, ...prevExpandedTagIds]);
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedTagIds.indexOf(nodeId);
    const newTagIds = [...expandedTagIds];
    newTagIds.splice(id, 1);
    setExpandedTagIds(newTagIds);
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <TreeExplorer
        sx={{ pt: 0 }}
        showButtons
        // data
        dataType={KEYWORD_TAGS}
        dataTree={tagTree as Node<ITagTree>}
        allData={allTags}
        dataIcon={LabelIcon}
        // selection
        selectedDataId={selectedTagId}
        setSelectedDataId={setSelectedTagId}
        handleSelectData={handleSelectTag}
        // expansion
        expandedDataIds={expandedTagIds}
        setExpandedDataIds={setExpandedTagIds}
        handleExpandClick={handleExpandClick}
        handleCollapseClick={handleCollapseClick}
        // filtering
        dataFilter={tagFilter}
        setDataFilter={setTagFilter}
        // actions - more actions can be added similar to ProjectCodes.tsx
        renderActions={(node) => {
          return <></>;
        }}
      />
      <TreeDataCreateDialog dataType={KEYWORD_TAGS} />
    </Box>
  );
}

export default ProjectTags;
