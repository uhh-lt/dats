import { Box, Divider, Toolbar, Typography } from "@mui/material";
import TagCreateDialog from "../../../features/CrudDialog/Tag/TagCreateDialog.tsx";
import TagExplorer from "../../../features/TagExplorer/TagExplorer.tsx";

function ProjectTags() {
  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Tags
        </Typography>
      </Toolbar>
      <Divider />
      <TagExplorer sx={{ pt: 0 }} showButtons />
      <TagCreateDialog />
    </Box>
  );
}

export default ProjectTags;
