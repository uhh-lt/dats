import { Box } from "@mui/material";
import TagCreateDialog from "../../../features/CrudDialog/Tag/TagCreateDialog.tsx";
import TagExplorer from "../../../features/TagExplorer/TagExplorer.tsx";

function ProjectTags() {
  return (
    <Box display="flex" className="myFlexContainer h100">
      <TagExplorer sx={{ pt: 0 }} showButtons />
      <TagCreateDialog />
    </Box>
  );
}

export default ProjectTags;
