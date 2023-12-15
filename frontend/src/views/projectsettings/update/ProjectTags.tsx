import { Box } from "@mui/material";
import TagCreateDialog from "../../../features/CrudDialog/Tag/TagCreateDialog";

import { ProjectProps } from "./ProjectProps";
import TagExplorer from "../../../features/TagExplorer/TagExplorer";

function ProjectTags({ project }: ProjectProps) {
  return (
    <Box display="flex" className="myFlexContainer h100">
      <TagExplorer sx={{ pt: 0 }} showButtons />
      <TagCreateDialog />
    </Box>
  );
}

export default ProjectTags;
