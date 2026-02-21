import { Box, Stack } from "@mui/material";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import { ImportJobsView } from "../../Import/ImportJobsView.tsx";
import { ImportSection } from "../../Import/ImportSection.tsx";

interface ProjectImportProps {
  project: ProjectRead;
}

export function ProjectImport({ project }: ProjectImportProps) {
  return (
    <Stack spacing={2} p={2} overflow="auto" height="100%" sx={{ backgroundColor: "grey.100" }}>
      <Stack direction="row" spacing={2}>
        <ImportSection projectId={project.id} />
      </Stack>
      <Box className="myFlexContainer myFlexFillAllContainer">
        <ImportJobsView projectId={project.id} />
      </Box>
    </Stack>
  );
}
